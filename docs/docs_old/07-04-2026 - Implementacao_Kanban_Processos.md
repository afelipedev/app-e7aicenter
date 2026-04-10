# Implementação do Kanban de Processos Jurídicos

## Objetivo
Implementar um módulo Kanban jurídico, separado do dashboard Judit, como novo submenu em `Processos`, com board único compartilhado pelo setor jurídico e experiência inspirada no Trello.

## O que foi implementado

### Navegação
- Novo submenu `Kanban` em `Processos`.
- Nova rota `"/documents/cases/kanban"`.
- Atalho adicional no dashboard atual de `Processos`.

### Nova feature frontend
Feature criada em `src/features/legal-kanban/` com:
- `pages/LegalKanbanPage.tsx`
- `services/legalKanbanService.ts`
- `hooks/useLegalKanbanBoard.ts`
- `hooks/useLegalKanbanFilters.ts`
- `components/LegalKanbanFiltersBar.tsx`
- `components/LegalKanbanBoardSettingsSheet.tsx`
- `components/LegalKanbanCardDetailsSheet.tsx`
- `types.ts`
- `constants.ts`
- `utils.ts`

### Funcionalidades entregues
- Board horizontal com visual estilo Trello.
- Drag and drop de colunas e cards com `@dnd-kit`.
- Criação de cards por coluna.
- Raias padrão:
  - `Caixa de Entrada`
  - `Audiencias`
  - `Holding`
  - `Concluídos`
  - `Arquivados`
- Configuração do board para `administrator` e `advogado_adm`:
  - criar nova raia
  - editar nome/cor da raia
  - reordenar raias
  - remover raias customizadas vazias
  - criar/remover etiquetas
  - criar/remover campos personalizados
- Modal lateral de card com:
  - título
  - status
  - prioridade
  - editor de texto rico
  - datas de início, entrega e lembrete
  - recorrência
  - checklist e subtarefas
  - comentários
  - anexos por arquivo
  - anexos por link
  - membros
  - etiquetas
  - campos personalizados
  - histórico de atividades
- Filtros por:
  - busca textual
  - membro
  - status
  - prazo
  - etiquetas
- Virtualização progressiva por coluna com `@tanstack/react-virtual`.
- Skeleton loading e layout responsivo.

## Banco de dados
Migration criada em:
- `supabase/migrations/20260407120000_create_legal_kanban_module.sql`

### Tabelas criadas
- `legal_kanban_boards`
- `legal_kanban_columns`
- `legal_kanban_labels`
- `legal_kanban_custom_fields`
- `legal_kanban_cards`
- `legal_kanban_card_members`
- `legal_kanban_card_labels`
- `legal_kanban_comments`
- `legal_kanban_activities`
- `legal_kanban_attachments`
- `legal_kanban_checklists`
- `legal_kanban_checklist_items`
- `legal_kanban_card_custom_field_values`

### Segurança
- Funções auxiliares:
  - `public.is_legal_kanban_member()`
  - `public.is_legal_kanban_admin()`
- RLS aplicada nas tabelas do módulo.
- Permissões do board:
  - `administrator` e `advogado_adm`: administração estrutural
  - `advogado`: operação de cards

### Storage
- Bucket privado criado:
  - `legal-kanban-attachments`
- Policies adicionadas para leitura/escrita dos anexos do Kanban.

## Dependências adicionadas
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `@tanstack/react-virtual`

## Integração com Supabase
- A migration do Kanban foi aplicada no Supabase via MCP.
- Verificação confirmada:
  - board padrão criado
  - 5 raias padrão criadas
  - RLS ativa nas novas tabelas

## Validações realizadas
- `npm run build` concluído com sucesso.
- Verificação visual no navegador em `http://localhost:8081/documents/cases/kanban`.
- Fluxo validado:
  - carregamento da página
  - exibição das raias padrão
  - criação de card na `Caixa de Entrada`
  - abertura do painel de detalhes do card

## Observações
- O módulo foi mantido separado do domínio Judit para preservar a separação de responsabilidades.
- O schema já suporta futura vinculação com `process_snapshots` via `process_snapshot_id`.
- A importação automática de processos da Judit ainda não foi implementada nesta entrega.
