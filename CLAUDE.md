# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository. For the full product reference in Portuguese, see **[docs/Documentacao-PRJ.md](docs/Documentacao-PRJ.md)** and the onboarding **[README.md](README.md)**.

---

# Regras e Diretrizes do Projeto

Seguir sempre estes princípios:
- Responder sempre em português pt-br
- Planning claro antes de começar
- Código reutilizável (D.R.Y)
- Soluções simples (K.I.S.S)
- Apenas o necessário (Y.A.G.N.I)
- Organização por features
- Separação de responsabilidades
- Ao final de cada implementacao, criar um doc.md  para cada implementacao, com o que foi implementado na pasta docs, com um padrao de data e titulo da implementacao. Ex.: DD/MM/AAAA - Titulo_Implementacao.md
- Para projetos com supabase, executar sempre o mcp do supabase para realizar as ações pertinentes a banco de dados

## 1. Planning (Planejamento)

- Defina componentes, fluxos e estrutura de pastas antes de iniciar.
- Listar e identificar as principais features.
- Identificar dependência entre as features.
- Elencar quais features precisam ser desenvolvidas primeiro.

> "Users should be able to" -> os usuários devem ser capazes de:

## 2. DRY (Don’t Repeat Yourself) -> Não repita se não necessário

- Crie funções ou variáveis reutilizáveis para elementos que não precisam se repetir.

## 3. K.I.S.S (Keep It Simple, Stupid) - Manter a simplicidade

- Evitar ao máximo overengineer.
- Implemente a versão mais simples primeiro, complique só se necessário.

## 4. Y.A.G.N.I (You Aren’t Gonna Need It) -> Você não vai precisar disso

- Construa apenas o que você precisa agora, adicione depois se precisar.

## 5. Feature-Based Folder Structure -> Estrutura de pasta baseada em recursos

Ao invés de organizar seu código por TIPO de arquivo (Exemplo: pasta com todos os componentes, pasta com todos os hooks, pasta com todos os serviços, etc), organize por FEATURE (exemplo: pasta com todos os arquivos da feature de autenticação, pasta com todos os arquivos da feature de billing, e por aí vai).

**Estrutura exemplo:**

```text
/auth
   /components
     - LoginForm.tsx
   /hooks
     - useAuth.ts
   /services
     - auth.ts
/billing
   /components
      - PaymentForm.tsx
   /hooks
     - useBilling.ts
   /services
     - stripe.ts
...
```

## 6. Separation of Concerns (Separação de Responsabilidades)

- Separar interface, cálculos e dados em arquivos ou funções diferentes.
- Separar as responsabilidades das features.
- Priorizar facilidade de encontrar bugs, manter o código, reutilizar, entender e escalar.


## Build & Development Commands

```bash
npm install       # Install dependencies
npm run dev       # Start Vite dev server on port 8081 (host ::)
npm run build     # Production build
npm run build:dev # Development build (see Vite mode / source maps)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

---

## Architecture Overview

**E7AI Center** is a **React SPA** (Vite) for **law firms and accounting offices**.

### Product areas

| Area | Location | Backend / integration |
|------|----------|----------------------|
| LLM assistants (5 chats) | `src/pages/assistants/` | Edge Function `chat-completion` |
| AI library (52 agents, 11 themes) | `src/config/aiAgents.ts`, `AgentChat` | N8N webhooks via `n8nAgentService.ts` |
| Payroll / SPED / reports | `src/pages/documents/`, `src/services/payrollService.ts`, `spedService.ts` | Supabase + N8N for processing |
| Processes (Judit) | `src/features/processes/` | Edge Functions `judit-*`, adapter pattern in `processProvider.ts` |
| Legal kanban (boards) | `src/features/legal-kanban/` | `legalKanbanService.ts`, boards at `/documents/cases/quadros` |
| Teams (Slack-like) | `src/features/teams/` | Supabase + Edge Functions `teams-*`, sync via `teams-kanban-bridge` |
| Leads CRM | `src/features/leads/` | Supabase + N8N messaging |
| User profile | `src/features/profile/` | `/perfil`, Edge Function `profile-update-email` |
| Admin / companies | `src/pages/admin/`, `Companies.tsx` | RBAC via `AuthContext` |
| Integrations UI | `src/pages/integrations/` | Power BI, calendar |

**Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions). **External:** N8N webhooks, Judit (processes/consumption), LLM providers on Edge Functions.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Build | **Vite 5**, `@vitejs/plugin-react-swc` |
| UI | **React 18**, **TypeScript**, **react-router-dom** v6 |
| Styling | **Tailwind CSS 3**, **tailwindcss-animate**, `@tailwindcss/typography` |
| Components | **shadcn/ui** (Radix primitives) |
| Server state | **TanStack React Query** v5 (stale 5m, gc 10m, retries w/ exponential backoff max 30s) |
| Forms | **react-hook-form**, **Zod**, `@hookform/resolvers` |
| Rich text / UX | **TipTap**, **@dnd-kit**, **recharts**, **@tanstack/react-virtual** |
| Theming / toasts | **next-themes**, **sonner**, shadcn toaster |
| Login UI | `@supabase/auth-ui-react` |
| Client | `@supabase/supabase-js` |

### Path Aliases

- `@/*` → `src/*`
- `~shared/*` → `shared/*` (shared types: payroll, company, sped)

### TypeScript

Relaxed strictness on purpose: `noImplicitAny: false`, `strictNullChecks: false` (see `tsconfig.json`). Do not assume full strict mode when refactoring.

---

## Repository Layout

```text
src/
  App.tsx              # Routes, QueryClientProvider, ThemeProvider
  components/          # Shared UI — layout/, assistants/, payroll/, ui/ (shadcn)
  config/              # aiAgents.ts (11 themes, 52 N8N agents)
  contexts/            # AuthContext (session, RBAC, first access, inactivity)
  features/            # Domain modules (see below)
  hooks/               # useChatHistory, usePermissions, useProcessingUpdates, use-mobile
  lib/                 # supabase.ts (PKCE client, no service role in browser), utils
  pages/               # Route-level pages (assistants, documents, admin, integrations, leads)
  services/            # Supabase + integrations (timeout pattern)
shared/types/          # payroll.ts, company.ts, sped.ts
supabase/
  functions/           # Edge Functions (Deno)
  migrations/          # Schema, RLS, feature evolution (~100+ files)
docs/                  # Implementation notes, Judit/DataJud/Uazapi API docs
```

### Feature modules (`src/features/`)

| Folder | Responsibility |
|--------|----------------|
| `leads/` | Leads CRUD, templates, CSV import/export, TipTap, N8N messaging (`n8nLeadMessagingService.ts`) |
| `legal-kanban/` | Legal boards (multi-board), columns/cards, TipTap editor, filters, attachments, members. Routes: `/documents/cases/quadros`, `/documents/cases/quadros/:boardSlug` |
| `processes/` | Process dashboard, queries, case details, Judit consumption. Adapter: `processProvider.ts` keeps UI decoupled from Judit API shape |
| `teams/` | Teams & channels (Slack/Teams-like). Posts, 1-level replies, reactions, mentions, favorites, PT-BR full-text search. Sidebar: `TeamsTreeSidebar`. Sync with kanban via `post_kanban_links` + `sync_event_ledger` + `kanbanBridgeService.ts`. Migration: `20260518030000_create_teams_module.sql` |
| `profile/` | User profile page (`/perfil`), avatar upload, security/password forms. Email edit restricted to `EMAIL_EDIT_ROLES` |
| `payroll/` | Batch upload form, holerite webhook utils |
| `theme/` | `ThemeProvider` (dark/light), `ThemeToggleButton` |

New features: prefer `components/`, `hooks/`, `pages/`, `services/`, `types.ts`, `utils/`.

### Service layer (`src/services/`)

| File | Purpose |
|------|---------|
| `chatService.ts` | Chats, messages, `LLMModel` type |
| `companyService.ts` | Client companies |
| `payrollService.ts` | Payroll / processing |
| `spedService.ts` | SPED |
| `userService.ts` | Users |
| `firstAccessService.ts` | First-access / forced password change |
| `userSyncService.ts` | Auth ↔ profile sync |
| `n8nAgentService.ts` | N8N webhooks (AI library) |
| `llmService.ts` | LLM interactions |
| `dashboardService.ts` | Dashboard data |

Example pattern:

```typescript
const { data, error } = await withTimeout(
  supabase.from('table').select('*'),
  DEFAULT_TIMEOUT
);
```

Feature-specific services live inside features (e.g. `legalKanbanService.ts`, `teams/*Service.ts`, `leadsService.ts`, `profileService.ts`).

---

## Authentication & RBAC

Auth: [AuthContext.tsx](src/contexts/AuthContext.tsx), `useAuth()`, **`hasPermission(permission)`**. Routes: [ProtectedRoute](src/components/ProtectedRoute.tsx) with `requiredPermission`.

| Role | Typical permissions |
|------|---------------------|
| `administrator`, `it`, `advogado_adm` | `admin`, `users`, `companies`, `modules`, `all` |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` |

**Rules:**

- User `status` must be **`ativo`**
- **First access** forces password change (`FirstAccessGuard` / [firstAccessService.ts](src/services/firstAccessService.ts))
- **Session** ends after **30 minutes** of inactivity (`SESSION_TIMEOUT_MS` in AuthContext)
- **Service role** must never be used in the browser — [supabase.ts](src/lib/supabase.ts) throws if accessed client-side
- Auth uses **PKCE** flow, storage key `e7ai-auth-token`

---

## Two AI Product Lines

1. **Standard chats (5 entry points):** Edge Function **`chat-completion`**, selectable models per chat. Pages: [src/pages/assistants/](src/pages/assistants/) — `ChatGeneral`, `TaxLaw`, `CivilLaw`, `Financial`, `Accounting`. Realtime: [useChatHistory](src/hooks/useChatHistory.ts).

2. **AI library (N8N):** [n8nAgentService.ts](src/services/n8nAgentService.ts) + [aiAgents.ts](src/config/aiAgents.ts). UI: library pages and [AgentChat](src/pages/assistants/AgentChat.tsx). **Not** the same persistence/model flow as Supabase chats.

### LLM models (keep in sync when adding/changing)

Current `LLMModel` values: `gpt-4`, `gpt-4-turbo`, `gpt-5.2`, `gemini-2.5-flash`, `claude-sonnet-4.5`.

Sync these files:

1. [chatService.ts](src/services/chatService.ts) — `LLMModel` type
2. [ModelSelector.tsx](src/components/assistants/ModelSelector.tsx) — `MODEL_INFO`
3. Supabase migration — `chats.llm_model` CHECK constraint
4. [supabase/functions/chat-completion/index.ts](supabase/functions/chat-completion/index.ts) — routing/mapping

### AI library themes (11)

`criacao-pecas-juridicas`, `revisao-pecas-juridicas`, `extracao-dados`, `revisao-melhoria-textos`, `estrategia-caso`, `jurisprudencia`, `atendimento-comunicacao-cliente`, `audiencia-julgamento`, `marketing-juridico-vendas`, `contratos`, `areas-direito` — **52 agents** total in [aiAgents.ts](src/config/aiAgents.ts).

---

## Routing (source of truth: [App.tsx](src/App.tsx))

### Public

- `/login` — Supabase Auth UI

### Protected (AppLayout)

- `/` — Dashboard
- **Assistants:** `/assistants/chat`, `/assistants/tax`, `/assistants/civil`, `/assistants/financial`, `/assistants/accounting`
- **Library:** `/assistants/library`, `/assistants/library/:themeId`, `/assistants/library/agent/:agentId`
- **Documents:** `/documents/payroll`, `/documents/sped`, `/documents/cases`, `/documents/cases/quadros`, `/documents/cases/quadros/:boardSlug`, `/documents/cases/queries`, `/documents/cases/:caseId`, `/documents/reports`
- **Payroll detail:** `/payroll/processing/:processingId`
- **Integrations:** `/integrations/powerbi`, `/integrations/calendar`
- **Leads:** `/leads`, `/leads/templates`
- **Teams:** `/teams`, `/teams/favorites`, `/teams/:teamSlug/:channelSlug`, `/teams/:teamSlug/:channelSlug/:postId`
- **Profile:** `/perfil`
- **Companies:** `/companies` (`requiredPermission="companies"`), `/companies/:companyId/payrolls`
- **Admin:** `/admin`, `/admin/users` (`requiredPermission="admin"`), `/admin/teams`, `/admin/teams/:teamId`
- **Dev/QA:** `/test`, `/test/payroll-workflow`
- `*` — `NotFound`

**Note:** Kanban routes use **`/documents/cases/quadros`** (not `/kanban`). Sidebar menu is defined in [AppSidebar.tsx](src/components/layout/AppSidebar.tsx).

---

## Realtime & React Query

- Chats use **Supabase Realtime**; [useChatHistory](src/hooks/useChatHistory.ts) handles subscriptions and message deduplication
- Payroll processing uses [useProcessingUpdates](src/hooks/useProcessingUpdates.ts)
- Teams notifications: `useNotifications` hook in features/teams
- **QueryClient** defaults in `App.tsx`: stale 5m, gc 10m, refetch on focus/reconnect, retry 3 with exponential backoff (max 30s)

---

## Supabase

### Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `chat-completion` | Multi-provider chat completions |
| `download-file` | Secure file download |
| `admin-create-user`, `admin-update-user-password` | Admin user operations |
| `judit-processes`, `judit-process-agent`, `judit-consumption-report` | Judit integration |
| `teams-admin-mutate` | Team admin mutations |
| `teams-channel-mutate` | Channel mutations |
| `teams-message-send` | Post message sending |
| `teams-search` | Full-text search (PT-BR) |
| `teams-kanban-bridge` | Bidirectional Teams ↔ Kanban sync |
| `profile-update-email` | Profile email update |

Judit API: **`docs/api-judit-docs/`**. DataJud (CNJ) reference docs: **`docs/api-datajud-cnj/`** (not yet wired in `src/`).

### Key tables & domains (non-exhaustive, RLS)

`users`, `companies`, `chats`, `chat_messages`, `payroll_files`, `payroll_processing`, `processing_logs`, **leads**, **legal kanban** (boards, columns, cards, comments, attachments…), **Judit/process** tables, **SPED**, **teams** (teams, channels, posts, post_messages, reactions, favorites, notifications), **user_profile_settings**, first-access/audit.

Schema changes: **always** versioned migrations under `supabase/migrations/` with coherent RLS. For Supabase work, use the Supabase MCP / CLI per project rules.

---

## Environment Variables

**Vite (`.env`, never commit secrets):**

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_WEBHOOK_DINAMICO=...  # Dynamic N8N webhook for agents
```

**Edge Functions** (Supabase project secrets): `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, plus integration secrets (e.g. Judit) per function.

---

## Conventions

- Prefer **timeout wrappers** on API/Supabase calls where the codebase already does
- Payroll file processing often flows through **N8N** webhooks (confirm current path in services/pages before changing)
- **UI copy and domain language** are primarily **Portuguese (Brazil)**
- **Dark mode** via `ThemeProvider` in `src/features/theme/` — respect design tokens when styling kanban/teams
- **TipTap** editors: shared patterns in `legal-kanban` (reused by teams post composer)
- **Process provider adapter** (`processProvider.ts`): keep Judit-specific mapping out of React components
- **Teams ↔ Kanban sync:** use `kanbanBridgeService.ts` and `teams-kanban-bridge` Edge Function; do not duplicate sync logic in UI
- For deep dives (routes, RBAC, feature history), use **`docs/Documentacao-PRJ.md`**, **`docs/Implementação_Equipes.md`**, and dated notes under **`docs/`**
- After significant implementations, add a dated doc in `docs/` (project convention)
