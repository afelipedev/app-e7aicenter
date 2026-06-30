# 29/06/2026 - Rearquitetura Assíncrona do Processamento de Holerites em Lote

## Contexto / Problema

O upload em lote de holerites (até 12 PDFs) era processado pelo workflow n8n
`yWiDyYB7gLhFpLBq` ("E7-LotePDF-Holerites", produção) de forma **síncrona**: o browser
mantinha a requisição HTTP aberta durante TODO o lote (Mistral OCR + GPT‑5 mini, com
`timeout 300000`/5min e `maxTries` 3–5 por arquivo). Resultado: ~1h de espera, timeouts de
gateway, erros e ausência de barra de progresso progressiva. Além disso, o n8n **nunca**
escrevia status/progresso de volta no Supabase e o **Realtime estava desabilitado**.

## Solução implementada (assíncrona com progresso real e persistência)

```
Browser → POST webhook → n8n Valida → Dedup → [responde 202 IMEDIATO]
   → OCR (Mistral) → IA (GPT-5 mini) → cálculo → XLSX → upload S3
        ↳ callbacks (Edge Function) atualizam payroll_processing.progress/status
   → callback final: completed + result_file_url
Browser ← Realtime/polling em payroll_processing → barra progressiva + auto-download do XLSX
```

### A. Supabase
- **Migração `payroll_realtime_and_progress_columns`**: habilita Realtime em
  `payroll_processing` e `processing_logs`; `REPLICA IDENTITY FULL`; novas colunas
  `files_total` / `files_done` (rótulo "arquivo X de Y").
- **Edge Function `payroll-processing-callback`** (`verify_jwt: false`, autenticada por
  header `x-callback-secret`): valida o segredo e chama a RPC existente
  `receive_processing_result` (atualiza `payroll_processing` + `payroll_files` +
  `processing_logs`); também grava `files_total`/`files_done`.

### B. Workflow n8n `yWiDyYB7gLhFpLBq` (editado via MCP, validado, errorCount=0)
- **Resposta 202 imediata**: novo nó `Responder 202` no ramo não-duplicado do
  `É Execução Duplicada?` → encadeia `Extract text` + `Upload PDF para S`. O nó final
  síncrono `Responder Webhook` foi **removido**. `Webhook` recebeu
  `onError: continueRegularOutput` (requisito do modo responseNode).
- **Callbacks de progresso** (HTTP → Edge Function, `onError: continueRegularOutput`):
  - `Callback Progresso OCR` (após `Preparar Texto Único`): progresso 10→70 por arquivo
    (`files_done`, `files_total`).
  - `Callback Progresso XLSX` (após `Adicionar Metadados ao XLSX`): progresso 92.
  - `Callback Final` (após `Preparar Resposta`, substitui o `Responder Webhook`):
    `status: completed`, `progress: 100`, `result_file_url`, `webhook_response`
    (com `retryOnFail`).
  - `Callback Erro`: ligado aos **error-outputs** (`onError: continueErrorOutput`) de
    `Extract text`, `AI Agent`, `Processar e Calcular` e `Upload XLSX para S3`; envia
    `status: error` + `error_message` (processing_id obtido de `Validar e Preparar Dados`).
    Elimina o "limbo" — falhas no n8n passam a refletir como erro na UI.
- **Fix de competência multi-lote**: `Validar e Preparar Dados` agora grava o `fileName`
  do binário no padrão `COMP[MM-AAAA]__IDX[N]__FID[file_id].pdf` que o `Processar e Calcular`
  já esperava (antes gravava o nome original → casamento por índice frágil, com risco de
  trocar competências entre arquivos).
- **Performance/robustez**: `OpenAI GPT-5 mini` `timeout 300000→120000`, `maxRetries 3→2`,
  `maxTries 3→2`, `wait 5s→2s`; `AI Agent` `maxTries 5→2`, `wait 5s→2s`.
- **Prompt da IA**: adicionada a regra 7 (sempre incluir `competencia` MM/AAAA no JSON).

### C. Frontend
- `holeriteWebhook.ts` → `getHoleriteWebhookTimeoutMs` reduzido (45s–240s; só cobre o
  upload + 202, não o processamento).
- `payrollService.ts` → `sendDirectToWebhook`: `maxRetries 3→2`; resposta 202 marca
  `processing` com `progress: 10` (callbacks dirigem o resto); sem auto-download síncrono.
- `PayrollManagement.tsx` → detecção de conclusão: quando um processamento ativo sai da
  lista de ativos, busca o resultado e, se `completed` com `result_file_url`, **baixa o
  Excel automaticamente + toast**; se `error`, toast de erro. Rótulo de progresso agora
  mostra "arquivo X de Y" (`files_done`/`files_total`).

## Correção (30/06/2026) — corrida entre callbacks

No 1º teste real (1 arquivo, ~1m35s) o processamento ficou preso em `processing/70` com
`result_file_url` nulo, embora o `Callback Final` tivesse retornado `ok`. Causa: **race condition**
— os callbacks de progresso e o final atualizavam a mesma linha pela RPC `receive_processing_result`
(destrutiva, sobrescreve todos os campos) sem ordem garantida; o callback de progresso do OCR
chegava ao Supabase DEPOIS do final, regredindo `completed → processing` e anulando o `result_file_url`.

Fix:
- Nova RPC **`update_processing_progress`** (migração `payroll_guarded_progress_update`):
  atualização **monotônica** (`progress = GREATEST(...)`) e **não-destrutiva**, com
  `WHERE status NOT IN ('completed','error')` — nunca regride nem toca linhas terminais.
- **Edge Function** roteia: `status='processing'` → `update_processing_progress` (guardada);
  `completed`/`error` → `receive_processing_result` (terminal/autoritativo).
- Verificado: `completed` aplica; `processing` atrasado é **ignorado** (linha permanece completed/100).

## Correção (30/06/2026 #2) — frontend não concluía + requests REST contínuas

Dois bugs no frontend após o backend já estar correto:
- O hook `useProcessingUpdates` (monitorAll) fazia **polling REST a cada 3s** que ou parava de
  vez (UI congelada em 10%, exigindo refresh) ou nunca parava (requisições contínuas a
  `payroll_processing?status=in.(pending,processing)`).

Fix:
- Nova subscription **`PayrollService.subscribeToActiveProcessings`** (Realtime/websocket).
- Hook reescrito: Realtime empurra qualquer mudança → refaz o fetch da lista; **heartbeat de
  fallback (8s) só enquanto houver processamento ativo**. Ocioso = **zero requisições REST**
  (apenas o canal Realtime escutando). Conclusão detectada na hora (Realtime) ou em ≤8s
  (heartbeat), disparando o auto-download + toast sem refresh.

## Correção (30/06/2026 #3) — detecção de término definitiva + sinal visual

O auto-download/“concluído” às vezes não disparava: a detecção dependia de inferir o término
pelo "desaparecimento" do item ativo entre renders do componente (frágil). Solução definitiva:
- A **detecção de término migrou para dentro do hook** (`useProcessingUpdates`), na própria função
  que busca os dados (`fetchActive`): compara os ids ativos anteriores com os atuais; o que saiu da
  lista tem os detalhes buscados e, se `completed`/`error`, chama `onTerminal(processing)` UMA vez.
- `useActiveProcessings({ onTerminal })` repassa o callback.
- `PayrollManagement`: `onTerminal` → **banner persistente "Processamento concluído"** com botão
  **Baixar Excel** (sinal visual claro, independente do auto-download) + auto-download + atualização
  do histórico; em erro → toast. Funciona via Realtime (instantâneo) ou heartbeat (≤8s) — mesmo se o
  Realtime estiver mudo, pois a detecção roda na busca de dados.

## Correção (30/06/2026 #4) — acompanhamento determinístico + spinner

A conclusão ainda não refletia sem refresh (dependia do Realtime/heartbeat do hook, instável).
Solução **definitiva e independente de Realtime**:
- `batchUpload` retorna `processing_id`; ao concluir o upload, a tela passa a fazer **polling
  direto desse id** (`getProcessingDetails`, a cada 3s) **somente enquanto não terminar**
  (idle = sem requisições). Esse poll atualiza o progresso e detecta a conclusão de forma
  determinística.
- **Finalizador idempotente** (`finalizeProcessing`) compartilhado entre o poll direto e o
  `onTerminal` do hook (dupla rede, sem duplicar): banner "Concluído" + auto-download + toast.
- A barra de progresso usa fonte **mesclada** (poll direto + lista do hook), priorizando o dado
  fresco do poll.
- **Spinner** (`Loader2`) no título do card e ao lado do percentual enquanto processa.

Fluxo do progresso/sinal agora não depende de Realtime: o poll do id garante que a UI reflita
exatamente o banco e conclua/baixe sozinho. (Realtime/heartbeat seguem como camada secundária.)

## Correção (30/06/2026 #5) — replicado em /documents/payroll

Os ajustes #3/#4 estavam só na `PayrollManagement` (`/companies/:id/payrolls`). Replicados em
[`src/pages/documents/Payroll.tsx`](../src/pages/documents/Payroll.tsx) (página multi-empresa):
acompanhamento determinístico por `processing_id` (poll 3s só enquanto ativo), finalizador
idempotente gated por ids iniciados na página, banner de conclusão + auto-download, spinner, e
remoção do auto-download antigo (que só mostrava um toast enganoso baseado em `webhook_response`).

### Sobre o percentual (10 → 70 → 92 → 100)
São **marcos por estágio** do pipeline, não progresso contínuo:
- 10 = upload aceito (frontend, no 202);
- 70 = OCR concluído (`Callback Progresso OCR`: `10 + round((files_done/files_total)*60)`);
- 92 = XLSX gerado/nomeado (`Callback Progresso XLSX`, fixo);
- 100 = `Callback Final` (completed).

Limitação: entre 70 e 92 roda a **extração por IA (GPT-5 mini)**, que é a etapa mais longa e **não
emite progresso** — então a barra "senta" em 70 boa parte do tempo. Abordagens melhores (a decidir):
(A) callback extra pós-IA; (B) loop por arquivo no n8n (granularidade real em lote);
(C) "trickle" no frontend (barra avança suavemente entre marcos reais) — recomendada por cobrir
inclusive 1 arquivo sem complexidade no n8n.

## Melhoria (30/06/2026 #6) — progresso "trickle" (C)

Novo componente reutilizável [`ProcessingProgressRow`](../src/features/payroll/components/ProcessingProgressRow.tsx):
entre os marcos reais do n8n a barra avança suavemente sozinha (desacelerando perto de um teto) e
**snapa** no valor real quando um novo marco chega — nunca passa do teto nem chega a 100 antes da
conclusão. Resolve o "travado em 70" durante a IA, inclusive para 1 arquivo. Usado nas duas páginas
(`PayrollManagement` e `documents/Payroll`). **(B — loop por arquivo no n8n: pendente, ver abaixo.)**

## Melhoria (30/06/2026 #7) — loop por arquivo na IA (B)

Implementado no workflow ativo `yWiDyYB7gLhFpLBq`. O OCR (Mistral) segue em lote (rápido); a
**extração por IA** passou a rodar dentro de um **Loop Over Items (Split In Batches, 1/vez)** —
a etapa mais lenta — com **callback de progresso por arquivo** (`Callback Progresso Arquivo`:
`30 + round((done_count/total)*60)`, 30→90). Assim a barra mostra "arquivo X de Y" avançando em
tempo real em lotes.

Topologia: `Preparar chatInput → Loop Arquivos`; loop(1)→`AI Agent`→`Acumular Resultado`
(acumula em `staticData[acc_<pid>]` + dispara callback) → volta ao loop; done(0)→`Ler Acumulados`
(lê/limpa o acumulado) → `Processar e Calcular` **reescrito** (lê competência/file_id/output de
cada item, sem referências cruzadas). OCR callback reduzido para ~30 (era 70) para o loop ter
range (a RPC de progresso é monotônica — GREATEST). `AI Agent` com `onError:
continueRegularOutput` (uma falha de arquivo não trava o loop; o arquivo é pulado).

> ⚠️ **Testar com lote real (1 e depois 5–12 PDFs)**: validei a estrutura (errorCount=0) mas o
> comportamento do loop/acumulação não foi testado com PDFs. **Rollback:** restaurar a versão
> anterior do workflow no histórico do n8n (estado pós-async, pré-loop, de 30/06).

## ⚠️ AÇÃO MANUAL OBRIGATÓRIA — cadastrar o segredo

Os callbacks só funcionam após o segredo existir **dos dois lados** (já está nos nós do n8n;
falta no Supabase). Valor gerado:

```
PAYROLL_CALLBACK_SECRET = 791fac104f8eb1cd991d5a7d268a9296cd12909f58ee358359ca37e790034a66
```

1. **Supabase** → Project Settings → Edge Functions → Secrets → adicionar
   `PAYROLL_CALLBACK_SECRET` com o valor acima (ou `supabase secrets set PAYROLL_CALLBACK_SECRET=...`).
   Enquanto não for setado, a função responde `500 "PAYROLL_CALLBACK_SECRET not set"`.
2. **n8n**: o valor já está nos headers dos nós `Callback *`. Se preferir não deixar hardcoded,
   troque por `={{ $env.PAYROLL_CALLBACK_SECRET }}` e configure o env no n8n.

## Verificação
1. `curl` na função com/sem secret correto → 200 vs 401 (atualmente 500 até setar o secret).
2. Upload de lote (1 e depois 5–12 PDFs): o POST resolve em segundos (202); a barra progride
   10→70 (OCR) →92 (XLSX) →100; toast de conclusão; XLSX baixa automaticamente.
3. Fechar a aba no meio e reabrir → status persiste e conclui (callbacks + Realtime).
4. n8n: `n8n_executions` confirma 202 rápido e callbacks chegando.

## Rollback
- Workflow: restaurar versão `7e3d700b-8f13-4e67-af1a-651e797953de` (ver
  `docs/lote-holerites/backup/ROLLBACK.md`).
- Realtime: `ALTER PUBLICATION supabase_realtime DROP TABLE ...` (aditivo/reversível).

## Limitações / Follow-up (Fase 2)
- **Erro em limbo**: se uma etapa do n8n falhar e nenhum callback final disparar, o registro
  pode ficar em `processing`. Follow-up: wire de `Callback Erro` nos error-outputs de
  `Extract text`/`AI Agent` (evitado agora por ser edição em workflow ativo) **ou** guarda de
  "stale" no frontend (marcar erro após N min sem progresso).
- **Payload grande**: 12 PDFs em base64 num único POST (>100MB). Follow-up: subir os PDFs
  direto ao S3/Storage no frontend e enviar apenas URLs ao n8n.
- **Progresso por arquivo durante a IA**: granularidade real exigiria um loop (Split In Batches)
  no n8n; hoje o progresso avança por estágios reais do pipeline.
- O JSON de referência `docs/lote-holerites/webhook-processador-holerites.json` está
  desatualizado vs. o workflow ao vivo (que tem os novos nós de callback/202).

## Arquivos alterados
- Supabase: migração `payroll_realtime_and_progress_columns`;
  `supabase/functions/payroll-processing-callback/index.ts`.
- n8n: workflow `yWiDyYB7gLhFpLBq`.
- Frontend: `src/features/payroll/utils/holeriteWebhook.ts`,
  `src/services/payrollService.ts`, `src/pages/PayrollManagement.tsx`.
