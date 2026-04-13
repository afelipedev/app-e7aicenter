# 10/04/2026 — Remoção da UI de campos personalizados no Kanban jurídico

## Objetivo

Remover a opção e as seções de **Campos personalizados** no modal de detalhes do card e no sheet **Configurar board**, conforme solicitado.

## Alterações

- **`LegalKanbanCardDetailsSheet.tsx`**
  - Removida a seção em card com lista/edição de valores de campos personalizados e o menu **Gerenciar**.
  - Removido o item **Campos personalizados** do menu **Adicionar ao card**.
  - Removido o dialog aninhado **Editar valores no card**.
  - Removidos estado, hooks de mutação e helpers usados apenas por essa funcionalidade.
  - Removida a prop opcional `onRequestBoardSettings` (era usada para abrir configuração a partir dos campos personalizados).

- **`LegalKanbanBoardSettingsSheet.tsx`**
  - Removida a seção completa de criação e listagem de campos personalizados (formulário **Adicionar campo** e linhas com exclusão).
  - Ajustada a descrição do sheet para mencionar apenas raias e etiquetas.

- **`LegalKanbanPage.tsx`**
  - Removido o callback `onRequestBoardSettings` passado ao `LegalKanbanCardDetailsSheet`.

## Observação

As tabelas/APIs de campos personalizados no backend não foram alteradas; apenas a interface deixou de expor essa funcionalidade.
