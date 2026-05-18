# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. For a full product and route reference (Portuguese), see **[docs/Documentacao-PRJ.md](docs/Documentacao-PRJ.md)** and the onboarding **[README.md](README.md)**.

---

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

**E7AI Center** is a **React SPA** (Vite) for **law firms and accounting offices**. It provides:

- **LLM assistants** (tax, civil, financial, accounting, general) via Supabase Edge Function `chat-completion`.
- **AI library agents** orchestrated with **N8N** webhooks (50+ agents, **11 themes** in [aiAgents.ts](src/config/aiAgents.ts)).
- **Document management**: payroll (holerite), **SPED**, reports, payroll processing detail pages.
- **Litigation workflows**: process queries and case details (**Judit** integration in [src/features/processes/](src/features/processes/)), **legal kanban** ([src/features/legal-kanban/](src/features/legal-kanban/)).
- **Leads CRM** ([src/features/leads/](src/features/leads/)): CRUD, templates, CSV import/export, N8N messaging where applicable.
- **Admin**: users and client companies with **RBAC**.
- **UI integrations**: Power BI, calendar ([App.tsx](src/App.tsx) routes under `/integrations/*`).

**Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions). **External:** N8N webhooks, Judit (processes/consumption), LLM providers configured on Edge Functions.

---

## Tech Stack

| Layer | Technologies |
|-------|----------------|
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

## Repository Layout (high level)

```text
src/
  App.tsx           # Routes + QueryClientProvider
  components/       # Shared UI, layout, payroll, assistants, ...
  config/           # aiAgents.ts (N8N agents/themes)
  contexts/         # AuthContext, ...
  features/         # Domain modules (see below)
  hooks/
  lib/              # Supabase client, helpers
  pages/            # Route-level pages
  services/         # Supabase + integrations (timeout pattern)
shared/types/
supabase/functions/ # Edge Functions (Deno)
supabase/migrations/
docs/               # Implementation notes, API docs (e.g. Judit)
```

### Feature modules (`src/features/`)

| Folder | Responsibility |
|--------|----------------|
| `leads/` | Leads CRUD, templates, CSV, forms, N8N messaging |
| `legal-kanban/` | Legal board, TipTap, dedicated service |
| `processes/` | Process queries, case details, Judit adapters/services |
| `teams/` | Equipes & Canais (Slack/Teams-like). Postagens com replies a 1 nível, reações, menções, favoritos, busca full-text PT-BR. Sidebar dinâmica (`TeamsTreeSidebar`). Edge Functions: `teams-admin-mutate`, `teams-kanban-bridge`. Reusa `LegalKanbanRichTextEditor`. Sync bidirecional com Kanban via `post_kanban_links` + `sync_event_ledger`. Migration `20260518030000_create_teams_module.sql`. |

New features: prefer `components/`, `hooks/`, `pages/`, `services/`, `types.ts`, `utils/`.

---

## Authentication & RBAC

Auth: [AuthContext.tsx](src/contexts/AuthContext.tsx), `useAuth()`, **`hasPermission(permission)`**. Routes: [ProtectedRoute](src/components/ProtectedRoute.tsx) with `requiredPermission`.

| Role | Typical permissions |
|------|---------------------|
| `administrator`, `it`, `advogado_adm` | `admin`, `users`, `companies`, `modules`, `all` |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` |

**Rules:** user `status` must be **`ativo`**; **first access** forces password change (`FirstAccessGuard` / [firstAccessService.ts](src/services/firstAccessService.ts)); **session** ends after **30 minutes** of inactivity.

---

## Service Layer

Database and integrations go through modules in **`src/services/`** (often with a **timeout** wrapper):

- [chatService.ts](src/services/chatService.ts) — chats, `LLMModel`
- [companyService.ts](src/services/companyService.ts)
- [payrollService.ts](src/services/payrollService.ts)
- [spedService.ts](src/services/spedService.ts)
- [userService.ts](src/services/userService.ts), [firstAccessService.ts](src/services/firstAccessService.ts), [userSyncService.ts](src/services/userSyncService.ts)
- [n8nAgentService.ts](src/services/n8nAgentService.ts) — N8N webhooks
- [llmService.ts](src/services/llmService.ts)

Example pattern:

```typescript
const { data, error } = await withTimeout(
  supabase.from('table').select('*'),
  DEFAULT_TIMEOUT
);
```

---

## Two AI Product Lines

1. **Standard chats (5 entry points):** Edge Function **`chat-completion`**, selectable models per chat. Pages: [src/pages/assistants/](src/pages/assistants/) — `ChatGeneral`, `TaxLaw`, `CivilLaw`, `Financial`, `Accounting`.

2. **AI library (N8N):** [n8nAgentService.ts](src/services/n8nAgentService.ts) + [aiAgents.ts](src/config/aiAgents.ts). UI: library pages and [AgentChat](src/pages/assistants/AgentChat.tsx). Not the same persistence/model flow as Supabase chats.

### Adding or Changing LLM Models

Keep these in sync:

1. [chatService.ts](src/services/chatService.ts) — `LLMModel` type
2. [ModelSelector.tsx](src/components/assistants/ModelSelector.tsx) — `MODEL_INFO`
3. Supabase migration — `chats.llm_model` CHECK constraint
4. [supabase/functions/chat-completion/index.ts](supabase/functions/chat-completion/index.ts) — routing/mapping

---

## Routing (source of truth: [App.tsx](src/App.tsx))

- `/login` — public (Supabase Auth UI)
- `/` — dashboard (protected, `AppLayout`)
- **Assistants:** `/assistants/chat`, `/assistants/tax`, `/assistants/civil`, `/assistants/financial`, `/assistants/accounting`
- **Library:** `/assistants/library`, `/assistants/library/:themeId`, `/assistants/library/agent/:agentId`
- **Documents:** `/documents/payroll`, `/documents/sped`, `/documents/cases`, `/documents/cases/kanban`, `/documents/cases/queries`, `/documents/cases/:caseId`, `/documents/reports`
- **Payroll detail:** `/payroll/processing/:processingId`
- **Integrations:** `/integrations/powerbi`, `/integrations/calendar`
- **Leads:** `/leads`, `/leads/templates`
- **Teams:** `/teams`, `/teams/favorites`, `/teams/:teamSlug/:channelSlug`, `/teams/:teamSlug/:channelSlug/:postId`; admin: `/admin/teams`, `/admin/teams/:teamId` (`requiredPermission="admin"`)
- **Companies:** `/companies` (`companies` permission), `/companies/:companyId/payrolls`
- **Admin:** `/admin`, `/admin/users` (`admin` permission)
- **Dev/QA:** `/test`, `/test/payroll-workflow`
- `*` — `NotFound`

---

## Realtime & React Query

- Chats may use **Supabase Realtime**; [useChatHistory](src/hooks/useChatHistory.ts) (or equivalent) handles subscriptions and message deduplication.
- **QueryClient** defaults in `App.tsx`: stale 5m, gc 10m, refetch on focus/reconnect, retry 3 with exponential backoff.

---

## Supabase

### Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `chat-completion` | Multi-provider chat completions |
| `download-file` | File download handling |
| `admin-create-user`, `admin-update-user-password` | Admin user operations |
| `judit-processes`, `judit-process-agent`, `judit-consumption-report` | Judit integration |

Judit API details: **`docs/api-judit-docs/`** when needed.

### Key Tables & Domains (non-exhaustive, RLS)

`users`, `companies`, `chats`, `chat_messages`, `payroll_files`, `payroll_processing`, `processing_logs`, **leads**, **legal kanban**, **Judit/process** tables, **SPED**, first-access/audit. Schema changes: **always** versioned migrations under `supabase/migrations/` with coherent RLS.

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

- Prefer **timeout wrappers** on API/Supabase calls where the codebase already does.
- Payroll file processing often flows through **N8N** webhooks (confirm current path in services/pages before changing).
- **UI copy and domain language** are primarily **Portuguese (Brazil)**.
- For deep dives (routes tables, RBAC verbatim, history of features), use **`docs/Documentacao-PRJ.md`** and dated notes under **`docs/`**.
