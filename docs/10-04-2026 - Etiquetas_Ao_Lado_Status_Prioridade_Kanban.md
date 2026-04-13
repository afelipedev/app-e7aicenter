# Etiquetas ao lado de status e prioridade (detalhe do card Kanban)

**Data:** 10/04/2026

## Objetivo

Ajustar o painel de detalhes do card do Kanban jurídico para que as etiquetas apareçam na mesma linha das badges de status e prioridade, e que a gestão de etiquetas ocorra apenas pelo botão **Etiquetas** (popover), sem seção dedicada com “Gerenciar”.

## Alterações

- **Removida** a seção em card (`Etiquetas` + botão `Gerenciar` + lista de badges duplicada).
- **Incluídas** as badges das etiquetas selecionadas (`data.labels`) logo após os dropdowns de status e prioridade, na mesma linha do número do card (`Card #`), mantendo `flex flex-wrap` para quebra em telas estreitas.

## Arquivo

- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`

## Comportamento

- Seleção e criação de etiquetas continuam no popover acionado pelo botão **Etiquetas** e pelo item **Etiquetas** do menu **Adicionar**.
