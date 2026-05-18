# Gestão de Equipes — adequações de UI e responsividade

**Data:** 18/05/2026

## Resumo

Ajustes visuais e de i18n nas páginas administrativas de equipes (`/admin/teams` e `/admin/teams/:teamId`), com layout responsivo para mobile e tablet.

## Alterações

### `/admin/teams` (`TeamsAdminPage.tsx`)

- Ícone de equipes (`Users`) antes do título "Gestão de Equipes".
- Visibilidade da equipe exibida em português (Pública / Privada).
- Lista de canais nos cards da equipe com ícone `#` (público) ou cadeado (privado) antes do nome.
- Layout responsivo: cabeçalho em coluna no mobile, botão "Nova equipe" em largura total, grid 1→2→3 colunas.

### `/admin/teams/:teamId` (`TeamDetailAdminPage.tsx`)

- Card **Membros**: ícone `Users` no título; papéis em PT-BR (Proprietário, Administrador, Membro).
- Card **Canais**: ícone `MessagesSquare` no título; `#` ou cadeado no nome do canal; prefixo **Descrição:** no tópico; visibilidade em PT-BR.
- Visibilidade da equipe no cabeçalho em PT-BR.
- Layout responsivo: formulários e linhas de membro empilham no mobile; selects e botões em largura total quando necessário.

### Utilitário compartilhado

- `src/features/teams/utils/labels.ts`: `formatVisibility()` e `formatTeamMemberRole()`.

## Arquivos

- `src/features/teams/pages/admin/TeamsAdminPage.tsx`
- `src/features/teams/pages/admin/TeamDetailAdminPage.tsx`
- `src/features/teams/utils/labels.ts`
