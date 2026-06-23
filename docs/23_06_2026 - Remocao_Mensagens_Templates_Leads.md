# 23/06/2026 - Remoção de Mensagens e Templates na tela de Leads

## Contexto

As funcionalidades de **Mensagens** (editor, templates e disparo WhatsApp/Email) e **Agente E7** na aba Formulário de Leads não serão mais utilizadas. A rota `/leads/templates` também foi descontinuada.

## O que foi feito

### Página `/leads`

- Removidos os painéis `LeadMessagePanel` e `E7AgentChat` do layout em duas colunas.
- Layout reorganizado:
  - **Formulário**: card centralizado (`max-w-3xl mx-auto`) com padding responsivo.
  - **Lista**: card em largura total para a tabela, importação e exportação CSV.
- Subtítulo atualizado para "Cadastro e gestão de leads".

### Rotas e arquivos removidos

- Rota `/leads/templates` em `App.tsx`.
- Páginas e componentes:
  - `src/pages/leads/Templates.tsx`
  - `src/features/leads/pages/LeadTemplatesPage.tsx`
  - `src/features/leads/components/LeadMessagePanel.tsx`
  - `src/features/leads/components/E7AgentChat.tsx`
  - `src/features/leads/components/TipTapEditor.tsx`
- Hooks e serviços exclusivos de mensagens/templates:
  - `useLeadTemplates.ts`
  - `leadTemplatesService.ts`
  - `n8nLeadMessagingService.ts`
- Tipos `MessageTemplate*` removidos de `types.ts`.

### Mantido

- CRUD de leads (formulário + tabela).
- Importação/exportação CSV.
- Alternância Cliente/Parceiro.
- Tabelas Supabase de templates (`message_templates`, etc.) — permanecem no banco; apenas a UI foi removida.

## Verificação

- `npm run build` concluído com sucesso após as alterações.
