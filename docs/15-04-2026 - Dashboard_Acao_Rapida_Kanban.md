# 15/04/2026 — Dashboard: ação rápida “Ver Processos” → Kanban

## O que foi feito

- No dashboard principal (`src/pages/Dashboard.tsx`), o card **Ver Processos** (ações rápidas) passou a navegar para `/documents/cases/kanban`, alinhado à rota já definida em `App.tsx` para a página de Kanban jurídico.
- O ícone do card foi alterado de `Briefcase` para `Trello` (lucide-react), o mesmo padrão visual usado no menu lateral para o item Kanban.

## Arquivos alterados

- `src/pages/Dashboard.tsx`
