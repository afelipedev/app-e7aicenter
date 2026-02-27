# 27/02/2025 - Alteração do tipo de lead: Fornecedor → Parceiro

## O que foi implementado

### Backend (Supabase)

- **Migration** `20260227_change_lead_type_fornecedor_to_parceiro.sql`:
  1. Remoção da constraint antiga `leads_lead_type_check`
  2. Atualização de todos os registros com `lead_type = 'fornecedor'` para `lead_type = 'parceiro'`
  3. Nova constraint permitindo apenas `'cliente'` e `'parceiro'`

- **Aplicação**: Migration aplicada via MCP Supabase (`apply_migration`).

### Frontend

- **types.ts**: `LeadType` alterado de `"cliente" | "fornecedor"` para `"cliente" | "parceiro"`.

- **LeadsPage.tsx**: Botão e label "Fornecedores" → "Parceiros"; estado `parceiro` no lugar de `fornecedor`.

- **LeadForm.tsx**: Textos de ajuda atualizados (Cliente/Parceiro).

- **n8nLeadMessagingService.ts**: Tipos de `lead_type` e `leadType` atualizados.

- **useLeadImportExport.ts**: `guessLeadType` aceita "parceiro"; mantida compatibilidade com CSV antigo (valor "fornecedor" é convertido para "parceiro").
