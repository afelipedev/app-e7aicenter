# 07/04/2026 — Campos personalizados no modal do card (Kanban jurídico)

## Objetivo

Eliminar a duplicidade de UI de “Campos personalizados” no modal do card (bloco inline `bg-muted/30` vs seção `bg-card`), manter apenas a seção em card, e fazer o botão **Gerenciar** abrir um menu com **Editar valores no card** (dialog aninhado) e **Criar campo no board** (abre o sheet de configuração do board, quando permitido).

## Alterações

- **`LegalKanbanCardDetailsSheet.tsx`**
  - Removido o painel inline `inlinePanel === "customFields"`.
  - **Gerenciar** passou a ser um `DropdownMenu`: editar valores (abre dialog com lista de `CustomFieldInput` + Salvar por campo) ou criar campo no board (chama `onRequestBoardSettings`).
  - Seção de campos personalizados visível mesmo sem campos no board, com mensagens e menu condicionais (quem pode gerenciar o board vê **Criar campo no board**).
  - Dialog aninhado para edição em lote dos valores, com **Fechar**.

- **`LegalKanbanPage.tsx`** (já integrado): `onRequestBoardSettings` fecha o card e abre `LegalKanbanBoardSettingsSheet`.

- **`LegalKanbanBoardSettingsSheet.tsx`** (já integrado): props `open` / `onOpenChange` para controle pela página.

## Validação

- `npm run build` concluído com sucesso.
