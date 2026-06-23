# 23/06/2026 - Ajuste Layout Admin Teams

## Contexto

A página de gestão de equipes (`/admin/teams`) utilizava um wrapper com `container mx-auto max-w-7xl`, o que centralizava o conteúdo e limitava a largura, diferindo do padrão das demais páginas administrativas (ex.: `/admin/users`).

## O que foi implementado

- **`TeamsAdminPage.tsx`**: substituído o wrapper `container mx-auto max-w-7xl px-0 sm:px-2` pelo padrão `p-4 sm:p-6 space-y-4 sm:space-y-6`, alinhado à página de usuários.
- **`TeamDetailAdminPage.tsx`**: mesmo ajuste na página de detalhe da equipe (`/admin/teams/:teamId`), removendo `max-w-7xl mx-auto` e aplicando o mesmo espaçamento vertical entre seções.

## Resultado

O conteúdo das páginas de gestão de equipes passa a ocupar a largura disponível com a mesma indentação das outras páginas do painel administrativo.
