# Configuração dos Modelos de Agentes

Este documento descreve **como foi estruturada a configuração e seleção de modelos (LLMs)** para os chats **fora da Biblioteca de IA**:

- **Chat Geral** (`assistantType = "chat-general"`)
- **Jurídico Tributário** (`assistantType = "tax-law"`)
- **Jurídico Civil** (`assistantType = "civil-law"`)
- **Financeiro** (`assistantType = "financial"`)
- **Contábil** (`assistantType = "accounting"`)

> Observação: a “Biblioteca de IA” (rota `AgentChat`) funciona via **agentes n8n** e não usa este mecanismo de seleção de LLM por `ModelSelector`. No final há um resumo da diferença.

---

## Visão geral do desenho

Esses 5 chats seguem o mesmo padrão:

- **UI**: cada tela define um `ASSISTANT_TYPE` fixo e mantém um estado `currentModel` (o modelo selecionado).
- **Persistência**: ao criar um chat, o modelo é salvo no banco como `chats.llm_model`.
- **Execução**: ao enviar mensagem, o frontend chama a **Edge Function** `chat-completion` passando:
  - `assistantType` (qual chat/assistente é)
  - `llmModel` (qual modelo executar)
- **Prompt**: a Edge Function seleciona o **system prompt** com base no `assistantType`.
- **Provedor**: a Edge Function roteia a chamada para OpenAI / Gemini / Claude conforme o prefixo do `llmModel` e aplica **fallback para GPT-4** em falhas (exceto erro de API key).

---

## Onde ficam as configurações (arquivos-chave)

- **Modelos disponíveis e tipos**
  - `src/services/chatService.ts`
    - Define o tipo `LLMModel` (união de strings):
      - `gpt-4`
      - `gpt-4-turbo`
      - `gpt-5.2`
      - `gemini-2.5-flash`
      - `claude-sonnet-4.5`

- **UI do seletor de modelos**
  - `src/components/assistants/ModelSelector.tsx`
    - Mantém o “catálogo” visual em `MODEL_INFO` (nome, descrição, ícone, etc.)
    - Emite `onModelChange(model)` para a tela que estiver usando

- **Prompts / títulos / descrições por chat**
  - `src/config/assistantPrompts.ts`
    - `ASSISTANT_PROMPTS`: system prompts por `assistantType`
    - `ASSISTANT_TITLES` e `ASSISTANT_DESCRIPTIONS`: labels para a UI

- **Telas dos 5 chats (fora da Biblioteca)**
  - `src/pages/assistants/ChatGeneral.tsx` (`chat-general`)
  - `src/pages/assistants/TaxLaw.tsx` (`tax-law`)
  - `src/pages/assistants/CivilLaw.tsx` (`civil-law`)
  - `src/pages/assistants/Financial.tsx` (`financial`)
  - `src/pages/assistants/Accounting.tsx` (`accounting`)

- **Helper de envio (padronização do POST para Edge Function)**
  - `src/utils/chatHelpers.ts`
    - `callChatCompletion(chatId, message, assistantType, llmModel)`
    - `handleSendMessage(...)` usado nas telas (exceto `ChatGeneral`, que tem uma implementação inline equivalente)

- **Execução do completion (Edge Function)**
  - `supabase/functions/chat-completion/index.ts`
    - Seleciona prompt por `assistantType`
    - Roteia por `llmModel` e chama o provedor
    - Salva mensagens em `chat_messages` com `metadata`

---

## Persistência no banco (Supabase)

A persistência do “modelo escolhido” é por chat, via coluna `llm_model`.

- **Tabela**: `public.chats`
- **Campo**: `llm_model`
- **Criação/constraints**: `supabase/migrations/038_create_chat_system.sql`
  - `assistant_type` é validado por CHECK para os tipos fixos (inclui os 4 chats acima).
  - `llm_model` é validado por CHECK com os modelos suportados.

Atualização:

- Migração `supabase/migrations/20260115_add_gpt_5_2_to_llm_model.sql` adiciona `gpt-5.2` ao CHECK de `public.chats.llm_model`.

Na prática:

- Ao criar um chat, `useChatHistory.createNewChat(llmModel)` chama `ChatService.createChat({ llm_model: llmModel })`.
- Ao carregar um chat, o hook expõe `currentChat.llmModel`, permitindo a UI sincronizar o seletor.

---

## Como o modelo é selecionado e “grudado” no chat (frontend)

### Estado local do modelo (por tela)

Cada tela começa com:

- `const [currentModel, setCurrentModel] = useState<LLMModel>("gpt-4");`

E depois sincroniza com o chat atual:

- se `currentChat?.llmModel` existir, ela faz `setCurrentModel(currentChat.llmModel)`.

Isso garante que:

- **cada conversa pode ter um modelo diferente**
- ao alternar entre conversas no histórico, o seletor reflete o `llm_model` gravado

### Alteração de modelo via `ModelSelector`

O componente `ModelSelector` dispara `onModelChange`.

Nas telas, o `handleModelChange` faz:

- `setCurrentModel(model)`
- e chama `createNewChat(model)`

> Importante: do jeito que está implementado hoje, **trocar o modelo tende a criar uma nova conversa** (porque chama `createNewChat`). Não há um `updateChat` explícito atualizando o `llm_model` do chat existente nessa UX.

---

## Como o modelo e o tipo do assistente chegam na LLM (Edge Function)

### Payload enviado pelo frontend

Ao enviar uma mensagem, o frontend faz `POST` para:

- `${VITE_SUPABASE_URL}/functions/v1/chat-completion`

Com JSON:

- `chatId`
- `message`
- `assistantType` (ex: `tax-law`)
- `llmModel` (ex: `claude-sonnet-4.5`)

### Seleção do prompt (system prompt)

Na Edge Function (`supabase/functions/chat-completion/index.ts`):

- `systemPrompt = ASSISTANT_PROMPTS[assistantType] || ASSISTANT_PROMPTS["chat-general"]`

Ou seja:

- se houver prompt específico para o `assistantType`, ele é usado
- se não, cai no prompt padrão de `chat-general`

### Roteamento por provedor (OpenAI / Gemini / Claude)

O roteamento é feito pelo prefixo do `llmModel`:

- `gpt-*` → OpenAI
- `gemini-*` → Gemini
- `claude-*` → Anthropic/Claude

E há mapeamentos internos para nomes “reais” de modelos nas APIs:

- `gpt-4-turbo` → `gpt-4-turbo-preview`
- `gpt-5.2` → `gpt-5.2`
- `gemini-2.5-flash` → `gemini-2.0-flash-exp`
- `claude-sonnet-4.5` → `claude-3-5-sonnet-20241022`

### Particularidade do `gpt-5.2` (OpenAI)

Na Edge Function (`supabase/functions/chat-completion/index.ts`):

- Quando o modelo selecionado é `gpt-5.2`, o request **não inclui** o campo `temperature`.
- Quando o modelo selecionado é `gpt-5.2`, o request usa **`max_completion_tokens`** (o parâmetro `max_tokens` não é aceito).
- Para os demais modelos (incluindo `gpt-4` e `gpt-4-turbo`), `temperature: 0.7` continua sendo enviado.
- Para os demais modelos (incluindo `gpt-4` e `gpt-4-turbo`), o limite de saída usa **`max_tokens`**.

### Fallback de modelo

Se um modelo **não GPT** falhar por motivo diferente de “API key não configurada”, a Edge Function tenta:

- **fallback para `gpt-4`**

### Salvamento de mensagens e metadata

A Edge Function:

- lê o histórico do chat em `chat_messages`
- chama o completion com histórico + prompt
- salva:
  - mensagem do usuário
  - resposta do assistente com `metadata` (por exemplo `model`, `tokens_used`, `finish_reason`)

---

## Variáveis de ambiente envolvidas

### Frontend

- `VITE_SUPABASE_URL` (usada para montar a URL da Edge Function)

> Existe também `src/services/llmService.ts` com suporte a `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_ANTHROPIC_API_KEY`, mas o fluxo dos 4 chats descritos aqui usa a Edge Function; logo, o caminho principal de execução não depende dessas chaves no browser.

### Edge Function (Supabase)

Em `supabase/functions/chat-completion/index.ts`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

---

## Como adicionar/alterar modelos suportados (checklist)

Para adicionar um novo modelo de LLM nesses chats (ex.: `gpt-4.1`), normalmente você precisa atualizar:

- `src/services/chatService.ts`
  - incluir o novo valor no tipo `LLMModel`
- `src/components/assistants/ModelSelector.tsx`
  - incluir no `MODEL_INFO` para aparecer na UI
- `supabase/migrations/*`
  - ajustar o CHECK constraint de `chats.llm_model` (e aplicar migração)
- `supabase/functions/chat-completion/index.ts`
  - incluir roteamento/mapeamento do modelo no provedor correto (e fallback, se necessário)

---

## Diferença para a “Biblioteca de IA” (contexto)

Os agentes da Biblioteca (`src/pages/assistants/AgentChat.tsx`) seguem um fluxo diferente:

- O “agente” vem de `src/config/aiAgents.ts` (lista `AI_AGENTS`)
- A execução é via `src/services/n8nAgentService.ts` (chama webhook do n8n)
- Não existe `ModelSelector` e não existe `llm_model` selecionável nesse fluxo

Ou seja:

- **Chats fora da Biblioteca** = LLM selecionável (OpenAI/Gemini/Claude) + prompt por `assistantType`
- **Biblioteca de IA** = agente n8n por `agentId` (integração externa), sem seleção de LLM na UI

