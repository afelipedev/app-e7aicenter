# 21/08/2026 - Atualização do Catálogo de Modelos LLM, Janela de Contexto e Correção de Custos

## Contexto

A aba **Modelos LLM** em Configurações do Sistema expunha o caminho interno do arquivo `src/config/llmModels.ts` num texto visível ao usuário. Além disso, o catálogo de modelos estava desatualizado frente às gerações mais recentes de OpenAI, Anthropic e Google, não tinha metadados numéricos (janela de contexto, preço por token) e o cálculo de custo em reais (`estimarCustoReais`) podia exibir R$ 0,00 silenciosamente para execuções de agentes com um `modelo_llm` inválido.

## O que foi implementado

### 1. Remoção do caminho de arquivo exposto na UI
`src/features/system-settings/components/LlmModelsTab.tsx` não menciona mais `src/config/llmModels.ts` no texto exibido ao usuário.

### 2. Catálogo de modelos expandido com metadados numéricos
`src/config/llmModels.ts` ganhou os campos `contextWindowTokens`, `maxOutputTokens` e `pricing` (USD por 1M tokens, informativo) em `LLMModelDefinition`. O catálogo passou de 14 para 29 modelos, com a nova geração verificada nas documentações oficiais (21/08/2026):

- **OpenAI:** gpt-5.6-sol/terra/luna, gpt-5.1, gpt-5, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4.1-mini (além dos 5 já existentes)
- **Anthropic:** claude-opus-5, claude-sonnet-5, claude-opus-4.7, claude-opus-4.6 (além dos 4 já existentes)
- **Google:** gemini-3.1-pro-preview, gemini-3-flash-preview (além dos 5 já existentes)

Nenhum id existente foi removido (preserva o histórico em `chats.llm_model`).

### 3. Estratégia de janela de contexto (truncamento real)
O campo "Janela de contexto" na aba de configurações era um campo morto (salvo em `system_llm_settings.context_window`, nunca lido pelo backend) — foi removido da UI. Em seu lugar, `supabase/functions/chat-completion/index.ts` agora trunca o histórico de mensagens antes de enviar ao provedor, com base em `contextWindowTokens`/`maxOutputTokens` do modelo selecionado (heurística de ~4 caracteres por token, sem dependência de tokenizer).

### 4. Propagação do catálogo
Os 15 novos modelos foram replicados nos espelhos obrigatórios (Deno não importa o módulo TS do frontend): `chat-completion/index.ts`, `_shared/llm.ts`. `ModelSelector.tsx` agora oculta modelos `legacy: true` da lista de seleção para novos chats (mas continua renderizando corretamente chats antigos que já os usam). `agente-gerar/index.ts` passou a derivar sua allowlist de modelos do mapa único em `_shared/llm.ts`, eliminando uma terceira lista mantida à mão.

Banco de dados: `chats_llm_model_check` e `precos_modelos` foram atualizados via migration (`add_new_llm_models_2026_generation`) para aceitar e precificar os 29 modelos. `src/lib/supabase.ts` (tipo `Database` mantido manualmente, não gerado) teve o union de `llm_model` sincronizado.

### 5. Correção do cálculo de custo (R$ 0,00)
Causa raiz: `agentes.modelo_llm` não era validado contra o catálogo ao criar/editar um agente, permitindo que um id "cru" devolvido pelo provedor (ex. `gpt-4o-2024-08-06`) fosse persistido em vez do id interno (`gpt-4o`), quebrando o lookup em `precos_modelos`.

- `src/features/ai-center-e7/services/agenteService.ts`: `criar()`/`atualizar()` agora validam `modelo_llm` contra `LLM_MODEL_IDS`, normalizando para `DEFAULT_LLM_MODEL_ID` quando inválido.
- `supabase/functions/_shared/llm.ts`: `estimarCustoReais` agora emite `console.warn` quando não encontra preço cadastrado, em vez de retornar `0` silenciosamente.
- `precos_modelos` populado para os 15 novos modelos (mesma migration do item 4).

**Limitação aceita:** tarifas escalonadas por volume (Gemini/OpenAI acima de 200K tokens) não são representadas no schema de taxa única de `precos_modelos` — usa-se sempre a tarifa base.

## Arquivos alterados

- `src/config/llmModels.ts`
- `src/features/system-settings/components/LlmModelsTab.tsx`
- `src/components/assistants/ModelSelector.tsx`
- `src/features/ai-center-e7/services/agenteService.ts`
- `src/lib/supabase.ts`
- `supabase/functions/chat-completion/index.ts`
- `supabase/functions/_shared/llm.ts`
- `supabase/functions/agente-gerar/index.ts`
- Migration `add_new_llm_models_2026_generation` (aplicada via Supabase MCP)

## Pendências conhecidas (fora de escopo desta implementação)

- *Drift* entre `supabase/migrations/` local e o estado remoto: 2 migrations aplicadas remotamente (`expand_chats_llm_model_check_new_models`, `expand_chats_llm_model_gemini3`) não têm arquivo local correspondente. Recomenda-se reconciliar com `supabase db pull` numa tarefa separada.
- Preço promocional de `claude-sonnet-5` ($2/$10 por 1M tokens) vigente até 2026-08-31 segundo a documentação oficial da Anthropic; depois disso passa a $3/$15 — requer atualização manual em `src/config/llmModels.ts` e na tabela `precos_modelos`.
