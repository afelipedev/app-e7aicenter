# Fix de Exibição de Membros no Modal do Board

## Contexto

Ao abrir o modal **Configurar Board**, os usuários já concedidos em permissões não apareciam selecionados, dando a impressão de que a concessão não havia sido salva.

## Implementação

- Ajuste no carregamento de contexto do board em `legalKanbanService`:
  - Inclusão de validação explícita de erro nas queries de raias, etiquetas, campos, cards e membros.
  - Query de membros com seleção explícita de campos do relacionamento com `users`.
  - Mapeamento resiliente dos membros (`filter(Boolean)`) para evitar inconsistência em payload parcial.

- Ajuste no modal `LegalKanbanBoardSettingsSheet`:
  - Construção de lista de opções de membros por **união** entre:
    - usuários atribuíveis (`listAssignableUsers`);
    - membros já presentes no board (`board.members`).
  - Deduplicação por `id`.
  - Exibição dos badges de selecionados e lista do picker baseada nessa união.

## Resultado esperado

- Usuários com permissão já concedida voltam a aparecer no modal ao reabrir.
- A leitura do board deixa de falhar silenciosamente quando houver erro no backend.

## Arquivos alterados

- `src/features/legal-kanban/services/legalKanbanService.ts`
- `src/features/legal-kanban/components/LegalKanbanBoardSettingsSheet.tsx`
