# 02/06/2026 - Upload em lote de holerites (competência individual + contrato N8N)

## Resumo

Alinhamento do módulo de gestão de holerites ao fluxo N8N `processar-holerite` (lote até 12 PDFs, um XLSX consolidado), com competência **por arquivo** na UI e correção do download automático do Excel.

## Contrato enviado ao webhook

- **Método:** `POST`
- **Content-Type:** `application/json`
- **URL:** `VITE_N8N_WEBHOOK_HOLERITE` ou fallback em `PayrollConfig.getWebhookUrl()`

```json
{
  "processing_id": "<uuid Supabase>",
  "company_id": "<uuid>",
  "company_name": "Razão Social",
  "company_cnpj": "12345678000195",
  "arquivos": [
    {
      "pdf_base64": "<base64 puro>",
      "competencia": "10/2025",
      "file_id": "<uuid payroll_files>",
      "filename": "holerite.pdf"
    }
  ]
}
```

## Resposta e download

Helpers em `src/features/payroll/utils/holeriteWebhook.ts`:

- `resolveHoleriteDownloadUrl()` — lê `download_url`, `excel_url`, `data.arquivo.urls.excel_download`, etc.
- Download automático quando `success` e `status === 'completed'`.
- Tratamento de `duplicate: true` (processamento já em andamento).

## UI

- Componente: `src/features/payroll/components/PayrollBatchUploadForm.tsx`
- Rotas: `/documents/payroll`, `/companies/:companyId/payrolls`
- Máximo **12** arquivos; cada linha: PDF + competência `MM/AAAA`
- Resumo das competências antes do envio

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `shared/types/payroll.ts` | `PayrollBatchUploadData`, `HoleriteWebhookBatchPayload`, `WebhookResponse` ampliado |
| `src/services/payrollService.ts` | `batchUpload`, `sendDirectToWebhook`, `applyWebhookResult` |
| `src/config/payrollConfig.ts` | URL do webhook via env |
| `src/pages/documents/Payroll.tsx` | Novo formulário de lote |
| `src/pages/PayrollManagement.tsx` | Idem (empresa fixa) |
| `src/components/payroll/ProcessingDetails.tsx` | Download e competências do lote |
| `.env.example` | `VITE_N8N_WEBHOOK_HOLERITE` documentada |

## Banco de dados

- `payroll_files.competencia`: por arquivo (MM/AAAA).
- `payroll_processing.competency`: `MM/AAAA` (arquivo único) ou `MM/AAAA-MM/AAAA` (lote, ex.: `10/2025-12/2025`).
- Migration: `20260603010000_payroll_batch_competency_range.sql` — coluna `VARCHAR(32)` e RPC `start_payroll_processing` aceitando intervalo.

## Checklist de testes manual

1. [ ] 1 PDF + competência → XLSX baixa automaticamente
2. [ ] 3 PDFs (`10/2025`, `11/2025`, `12/2025`) → um XLSX ordenado
3. [ ] 13º arquivo bloqueado na UI
4. [ ] Linha sem competência → botão desabilitado / validação
5. [ ] Reenvio rápido → aviso de duplicata
6. [ ] Histórico: download Excel e competência exibida como intervalo
7. [ ] `/companies/:id/payrolls` com empresa pré-selecionada
8. [ ] Lote grande: aguardar timeout ampliado (até 300s para 7–12 arquivos)

## Referências

- `docs/lote-holerites/frontend-ajustes-holerite.md`
- `docs/lote-holerites/webhook-processador-holerites.json`
