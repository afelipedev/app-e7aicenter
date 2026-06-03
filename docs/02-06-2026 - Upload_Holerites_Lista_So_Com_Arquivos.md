# 02/06/2026 — Upload holerites: lista só após adicionar PDFs

## Alteração

Na seção **Arquivos e competências** (`PayrollBatchUploadForm`), a lista não é mais exibida ao abrir a página.

- Estado inicial: `createInitialUploadRows()` retorna `[]`.
- A lista aparece somente depois de arrastar/selecionar pelo menos um PDF.
- Removido placeholder "Linha 1 — sem arquivo" e o botão "Adicionar linha".

## Arquivo

- `src/features/payroll/components/PayrollBatchUploadForm.tsx`

## Páginas afetadas

- `/documents/payroll`
- `/companies/:companyId/payrolls`
