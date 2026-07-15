# 14/07/2026 - Correção de Anexos no Kanban

Revisão e correção do módulo de anexos dos cards do kanban jurídico/operacional
(`legal-kanban`), motivada por relatos de anexos que "não ficavam salvos" no card
(ex.: card #1686).

## Diagnóstico

Investigação no código e no banco de produção revelou três problemas:

1. **Upload falhando silenciosamente (causa do card #1686).**
   O bucket `legal-kanban-attachments` aceitava apenas `pdf, png, jpeg, webp,
   text/plain, docx` e limite de 10 MB. Ao anexar tipos comuns do jurídico
   (`.doc`, `.xls/.xlsx`, e-mails `.msg/.eml`, `.zip`, `.csv`, etc.) ou arquivos
   maiores, o Storage rejeitava o upload (HTTP 400), o `INSERT` do anexo nunca
   ocorria e só aparecia um toast de erro. O card #1686 não tinha registro, objeto
   no Storage nem atividade — confirmando falha na etapa de upload.
   Agravado por: o `<input type="file">` não tinha `accept` nem validação de
   tamanho/tipo no cliente.

2. **Anexos duplicados em massa.** 3.634 registros de anexo tipo `file` para
   apenas 1.820 arquivos físicos: **1.814 anexos gravados em dobro** no mesmo card.
   Origem no caminho de compartilhar/duplicar card: a edge function
   `kanban-card-bridge` copiava os anexos e os triggers de sync também espelhavam,
   sem nenhuma constraint de unicidade para impedir a duplicação.

3. **Exclusão apagava arquivo compartilhado.** `deleteAttachment` removia o objeto
   do Storage pelo `file_path` antes de checar se outro registro (card
   vinculado/duplicado) ainda o referenciava, deixando "anexos fantasmas" que não
   abriam.

Observação: uma versão anterior do trigger de sync (migração 20260623) inseria na
coluna inexistente `file_name` — corrigida para `name` na migração 20260713121000,
já ativa em produção.

## Alterações

### Banco de dados (migrations)

- **`20260714120000_expand_kanban_attachments_bucket.sql`** — amplia
  `allowed_mime_types` do bucket (Office completo, OpenDocument, e-mails,
  compactados, imagens, assinatura digital, `application/octet-stream` como
  fallback) e eleva `file_size_limit` de 10 MB para **50 MB**.
- **`20260714120100_dedupe_and_unique_kanban_attachments.sql`** — remove as 1.814
  duplicatas mantendo a linha mais antiga de cada grupo (com a flag anti-sync ativa
  para não apagar cópias legítimas de peers) e cria índices únicos parciais:
  `(card_id, file_path)` para arquivos e `(card_id, url)` para links.
- **`20260714120200_kanban_attachment_sync_on_conflict.sql`** — o trigger
  `kanban_sync_linked_attachment_insert` passa a usar `ON CONFLICT DO NOTHING`,
  tornando o espelhamento idempotente.

Resultado da limpeza: 3.634 → 1.820 registros, 0 duplicatas, 1.820 paths distintos
preservados (nenhum arquivo órfão).

### Edge Function `kanban-card-bridge`

- `copyCardRelations` passa a copiar anexos com `upsert(..., { ignoreDuplicates: true })`
  separando arquivos (`onConflict: card_id,file_path`) de links
  (`onConflict: card_id,url`), evitando dobra em reprocessamentos. (versão 4)

### Frontend

- **`constants.ts`** — novas constantes `LEGAL_KANBAN_ATTACHMENT_MAX_BYTES` (50 MB)
  e `LEGAL_KANBAN_ATTACHMENT_ACCEPT` (extensões aceitas).
- **`LegalKanbanCardDetailsSheet.tsx`** — `accept` nos dois inputs de arquivo,
  validação de tamanho antes do upload e novo helper `describeUploadError` que
  traduz erros técnicos do Storage (mime/tamanho/duplicado) para mensagens claras.
- **`legalKanbanService.ts`** — `deleteAttachment` agora exclui o registro primeiro
  e só remove o objeto do Storage quando nenhum outro registro referencia o mesmo
  `file_path`.

## Validação

- `tsc --noEmit`: sem erros.
- Lint dos arquivos alterados (componente e constants): sem erros novos (os erros
  `no-explicit-any` remanescentes no service são pré-existentes).
- Contagens no banco confirmadas antes/depois da limpeza.

## Recomendações de acompanhamento

- Verificar com o usuário qual arquivo foi anexado ao card #1686 para confirmar
  100% o tipo/tamanho rejeitado.
- Monitorar novos anexos em cards duplicados para confirmar que não voltam a
  duplicar.
