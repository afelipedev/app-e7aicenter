# Refatoração Quadros (Kanban)

## Escopo implementado

- Renomeação de navegação e rotas de `Kanban` para `Quadros`.
- Nova home de Quadros em `/documents/cases/quadros`.
- Rota dedicada por quadro em `/documents/cases/quadros/:boardSlug`.
- Reaproveitamento do Kanban atual para operar por `slug` do quadro.
- Modal/sheet de configuração reaproveitado e expandido para:
  - nome do quadro;
  - slug;
  - capa;
  - concessão de acesso por usuários;
  - botões de cancelar/salvar.
- Seções na home:
  - `Meus Quadros`;
  - `Quadros Favoritos`.
- Favoritar/desfavoritar quadro em cards horizontais.
- Regras de permissão aplicadas no frontend e service:
  - criação/configuração de quadros: `administrator`, `it`, `advogado_adm`;
  - concluir/arquivar/excluir card: `administrator`, `advogado_adm`.
- Regra de conclusão:
  - ao marcar card como `concluido`, movimenta automaticamente para a raia `done`.
- Menções em comentários com `@`:
  - autocomplete de usuários associados ao quadro;
  - persistência de menções no backend.
- Ajuste no modal `Novo Quadro`:
  - slug não é exibido;
  - slug é gerado automaticamente a partir do nome do quadro (ex.: `Painel Tributário` -> `painel-tributario`);
  - permissões com componente de busca + multi-select de usuários.
- Atualização da home de quadros:
  - botão de excluir quadro (icon button) no card;
  - modal de confirmação para exclusão;
  - exclusão executada no Supabase via service.
- Atualização do modal `Novo Quadro`:
  - novo campo de `Descrição do quadro` na seção de dados.
- Ajuste de etiquetas:
  - listagem de etiquetas compartilhada entre todos os quadros;
  - criação de etiqueta reaproveita etiqueta já existente por nome para evitar duplicidade.
- Ajuste de menções em comentários:
  - detecção de `@` revisada;
  - autocomplete de usuários do quadro voltou a listar corretamente;
  - seleção preenche automaticamente o nome do usuário no comentário.

## Arquivos principais alterados

- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/features/processes/constants.ts`
- `src/features/processes/pages/ProcessesDashboardPage.tsx`
- `src/pages/Dashboard.tsx`
- `src/features/legal-kanban/pages/LegalBoardsHomePage.tsx`
- `src/features/legal-kanban/pages/LegalKanbanPage.tsx`
- `src/features/legal-kanban/components/LegalKanbanBoardSettingsSheet.tsx`
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`
- `src/features/legal-kanban/hooks/useLegalKanbanBoard.ts`
- `src/features/legal-kanban/services/legalKanbanService.ts`
- `src/features/legal-kanban/types.ts`
- `src/features/legal-kanban/constants.ts`

## Supabase (schema e backend)

- Migration adicionada:
  - `supabase/migrations/20260518021000_refactor_legal_kanban_to_boards.sql`
- Objetos incluídos:
  - `legal_kanban_board_members`
  - `legal_kanban_board_favorites`
  - `legal_kanban_comment_mentions`
  - campos de capa em `legal_kanban_boards`
- Funções auxiliares e políticas RLS para evolução de acesso por quadro.

### Execução via MCP Supabase

- Foi executado `list_tables` para inspeção do schema atual.
- Foi executado `apply_migration` (core) para criação dos objetos-base de membership, favoritos, menções e suporte de capa.
- Foi executado `execute_sql` para validação de colunas do board no banco.

## Validação

- Build executado com sucesso: `npm run build`.
- Lint global possui débitos legados no repositório (não relacionados apenas a esta entrega), mas os arquivos alterados para a refatoração não apresentaram erros no diagnóstico local de lint.
