## Implementacao: Dark Mode no Design System

Data: 18/05/2026

### O que foi implementado
- Criado `ThemeProvider` com `next-themes` em `src/features/theme/providers/ThemeProvider.tsx`, com tema inicial `light` e alternancia por classe CSS.
- Criado componente reutilizavel `ThemeToggleButton` em `src/features/theme/components/ThemeToggleButton.tsx`.
- Integrado o provider global no `App` para habilitar alternancia de tema em toda a plataforma.
- Adicionado o botao de alternancia de tema ao lado do sino de notificacoes no header.
- Expandido o design system em `src/index.css` com o bloco `.dark`, mantendo os mesmos tokens (`background`, `card`, `popover`, `primary`, `muted`, `border`, `sidebar`, etc.) para preservar consistencia visual.

### Resultado
- O modo escuro passa a funcionar de forma global e consistente com os componentes existentes.
- O modo claro foi preservado sem alteracao de comportamento, pois os tokens `:root` originais foram mantidos.
- A troca de tema fica acessivel no topo da aplicacao, junto ao icone de notificacoes.
