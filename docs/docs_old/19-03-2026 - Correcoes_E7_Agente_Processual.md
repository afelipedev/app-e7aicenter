## Implementação

Foram aplicadas correções no fluxo do `E7 Agente Processual` para evitar respostas quebradas como `[object Object]` nas seções de partes envolvidas e movimentações.

## Problema identificado

- O backend convertia campos retornados pela OpenAI com `String(...)`.
- Quando a resposta vinha estruturada como objeto ou array, a serialização resultava em `[object Object]`.
- O botão de atualizar análise reutilizava o fluxo padrão de `refetch`, sem forçar regeneração do resumo quando o cache já estava ruim.

## O que foi corrigido

- Criação de uma normalização estruturada no `judit-process-agent` para transformar arrays e objetos em texto legível.
- Inclusão de heurísticas para formatar melhor partes e movimentações.
- Reforço do prompt do agente para exigir texto puro em todas as chaves do JSON.
- Detecção de cache quebrado contendo `[object Object]`, forçando nova geração em vez de reutilizar o resumo inválido.
- Troca do salvamento em cache para `upsert`, atualizando resumos anteriores quando necessário.
- Implementação de refresh forçado do resumo no frontend para realmente regenerar a análise.
- Ajuste visual de renderização no detalhe do processo com `whitespace-pre-line`, preservando quebras de linha e listas textuais.

## Arquivos alterados

- `supabase/functions/judit-process-agent/index.ts`
- `src/features/processes/hooks/useProcesses.ts`
- `src/features/processes/pages/ProcessDetailsPage.tsx`

## Validação

- `ReadLints` sem erros nos arquivos alterados do frontend.

## Observação

Para resumos antigos que já estavam cacheados com conteúdo quebrado, a nova lógica deixa de reaproveitar esses textos inválidos e permite regeneração correta ao abrir a aba do agente ou ao usar a ação de atualizar análise.
