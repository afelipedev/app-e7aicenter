# Remoção de integração Trello

## O que foi implementado

- Remoção do item **Trello** do menu **Integrações** na sidebar.
- Remoção da rota `/integrations/trello` do roteador principal.
- Exclusão da página `src/pages/integrations/Trello.tsx`, que não é mais utilizada.

## Arquivos alterados

- `src/components/layout/AppSidebar.tsx`
- `src/App.tsx`
- `src/pages/integrations/Trello.tsx` (removido)

## Resultado esperado

- O menu de Integrações exibe somente:
  - PowerBI
  - Agenda
- A URL `/integrations/trello` deixa de existir e passa a cair em `NotFound` via rota coringa.
