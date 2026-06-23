# 17/06/2026 — Atualização README.md e CLAUDE.md

## O que foi feito

Revisão da estrutura atual do código (`src/App.tsx`, `src/features/`, `src/services/`, `supabase/functions/`, sidebar e config de agentes) e atualização completa de:

- `README.md` — documentação pública de onboarding
- `CLAUDE.md` — guia para assistentes de código

Referência base: `docs/Documentacao-PRJ.md`, complementada com o estado real do repositório.

## Principais correções e inclusões

### Módulos documentados

| Módulo | Pasta | Novidade na doc |
|--------|-------|-----------------|
| Equipes | `src/features/teams/` | Inclusão completa (rotas, Edge Functions, sync kanban) |
| Perfil | `src/features/profile/` | Rota `/perfil`, `profile-update-email` |
| Kanban jurídico | `src/features/legal-kanban/` | Rotas atualizadas para `/documents/cases/quadros` |
| Payroll (feature) | `src/features/payroll/` | Upload em lote |
| Theme | `src/features/theme/` | Dark mode |

### Rotas corrigidas

- Kanban: de `/documents/cases/kanban` → **`/documents/cases/quadros`** e **`/documents/cases/quadros/:boardSlug`**
- Equipes: `/teams`, `/teams/favorites`, threads por postagem
- Admin equipes: `/admin/teams`, `/admin/teams/:teamId`
- Perfil: `/perfil`

### Edge Functions adicionadas à documentação

- `teams-admin-mutate`, `teams-channel-mutate`, `teams-message-send`, `teams-search`, `teams-kanban-bridge`
- `profile-update-email`

### Serviços

- Inclusão de `dashboardService.ts`
- Referência a serviços dentro de features (teams, leads, legal-kanban, profile)

### Biblioteca de agentes

- **52 agentes** em **11 temas** (contagem via `aiAgents.ts`)
- Modelos LLM atuais: `gpt-4`, `gpt-4-turbo`, `gpt-5.2`, `gemini-2.5-flash`, `claude-sonnet-4.5`

## Arquivos alterados

- `README.md`
- `CLAUDE.md`
- `docs/17-06-2026 - Atualizacao_README_CLAUDE.md` (este arquivo)

## Observação

O arquivo `docs/Documentacao-PRJ.md` ainda reflete revisão de 18/05/2026 e não inclui Equipes, Perfil nem rotas de quadros — recomenda-se alinhá-lo numa próxima revisão se for mantido como fonte única de verdade.
