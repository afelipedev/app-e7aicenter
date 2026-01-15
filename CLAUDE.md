# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start dev server on port 8081
npm run build     # Production build
npm run build:dev # Development build with source maps
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Architecture Overview

**E7AI Center** is a React application for law firms and accounting offices, providing AI assistants and document management with a focus on automated payroll (holerite) processing.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS
- **State**: React Context (auth) + TanStack React Query (data fetching)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Forms**: React Hook Form + Zod validation

### Path Aliases
- `@/*` → `src/*`
- `~shared/*` → `shared/*`

## Key Architectural Patterns

### Authentication & RBAC
Auth is managed via `AuthContext` ([src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)). Role-based permissions:

| Role | Permissions |
|------|-------------|
| `administrator`, `it`, `advogado_adm` | Full access (`all`) |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` only |

Use `hasPermission(permission)` from `useAuth()` hook. Routes are protected via `ProtectedRoute` component with `requiredPermission` prop.

### Service Layer Pattern
All database operations go through static service classes in `src/services/`:
- `ChatService` - Chat CRUD and management
- `CompanyService` - Company operations
- `PayrollService` - Payroll file processing
- `UserService` - User management
- `N8NAgentService` - AI agent webhook calls

Services use a timeout wrapper pattern:
```typescript
const { data, error } = await withTimeout(
  supabase.from('table').select('*'),
  DEFAULT_TIMEOUT
);
```

### Two AI Chat Systems

1. **Standard Chats** (5 types): Use Supabase Edge Function `chat-completion` with selectable LLM models (GPT-4, GPT-5.2, Gemini, Claude). Located at `src/pages/assistants/` - `ChatGeneral`, `TaxLaw`, `CivilLaw`, `Financial`, `Accounting`.

2. **AI Library Agents**: Use N8N webhooks via `n8nAgentService.ts`. Configured in `src/config/aiAgents.ts` (50+ agents across 11 themes). Accessed via `AgentChat.tsx`.

### Adding/Modifying LLM Models
When adding a new LLM model, update:
1. `src/services/chatService.ts` - Add to `LLMModel` type
2. `src/components/assistants/ModelSelector.tsx` - Add to `MODEL_INFO`
3. Supabase migration - Update `chats.llm_model` CHECK constraint
4. `supabase/functions/chat-completion/index.ts` - Add routing/mapping

### Realtime Subscriptions
Chats use Supabase realtime for live updates. The `useChatHistory` hook manages subscriptions and message deduplication.

### React Query Configuration
- Stale time: 5 minutes
- GC time: 10 minutes
- Retry: 3 attempts with exponential backoff (max 30s)

## Database Schema (Supabase)

Key tables with RLS enabled:
- `users` - User profiles linked to `auth.users`, includes `role` and `status`
- `companies` - Client companies with CNPJ validation
- `chats` / `chat_messages` - Chat system with `llm_model` per chat
- `payroll_files` / `payroll_processing` - Payroll document processing
- `processing_logs` - Audit trail for payroll processing

## Environment Variables

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_WEBHOOK_DINAMICO=...  # Dynamic agent webhook
```

Edge Functions require: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`

## Important Conventions

- User status must be `ativo` to access the app
- First-time users must change password via `FirstAccessGuard` modal
- Session timeout: 30 minutes of inactivity
- All API calls should use the timeout wrapper utilities
- File uploads for payroll go through N8N webhooks for processing
