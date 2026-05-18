# E7AI Center

Aplicação web (**React** + **Vite**) para **escritórios de advocacia e contabilidade**: assistentes de IA, gestão documental (holerite, SPED), processos judiciais com integração **Judit**, kanban jurídico, CRM de leads e administração de usuários e empresas. Backend principal: **Supabase** (PostgreSQL, Auth, Realtime, Storage, Edge Functions), com orquestração **N8N** para a biblioteca de agentes.

Documentação detalhada: [`docs/Documentacao-PRJ.md`](docs/Documentacao-PRJ.md).

---

## Principais funcionalidades

- **Assistentes de IA** — chats por área (geral, tributário, civil, financeiro, contábil) via Edge Function `chat-completion`.
- **Biblioteca de agentes** — dezenas de agentes em **11 temas**, via webhooks **N8N** (`src/config/aiAgents.ts`).
- **Documentos** — folha de pagamento (holerite), **SPED**, relatórios; detalhes de processamento em `/payroll/processing/:id`.
- **Processos e kanban** — consultas, detalhes de casos (`src/features/processes/`), board jurídico (`src/features/legal-kanban/`).
- **Leads** — CRUD, templates, importação/exportação (`src/features/leads/`).
- **Empresas e admin** — gestão de empresas e usuários com **RBAC** (rotas protegidas por permissão).

---

## Requisitos

- **Node.js** e **npm** (recomendado gerenciar versão com [nvm](https://github.com/nvm-sh/nvm)).
- Projeto **Supabase** configurado (URL, chave anônima) e Edge Functions/secrets quando for usar chat, admin ou Judit.

---

## Como rodar localmente

```bash
git clone <URL_DO_REPOSITORIO>
cd app-e7aicenter
npm install
npm run dev
```

O servidor de desenvolvimento sobe em **http://localhost:8081** (porta definida em `vite.config.ts`).

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (Vite, hot reload) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development (ex.: source maps) |
| `npm run lint` | ESLint |
| `npm run preview` | Servir o build de produção localmente |

---

## Variáveis de ambiente (frontend)

Crie um arquivo `.env` na raiz (não commite segredos). Variáveis **Vite** devem usar o prefixo `VITE_`:

```bash
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-chave-anon>
VITE_N8N_WEBHOOK_DINAMICO=<url-do-webhook-dinamico-n8n>
```

**Edge Functions** (configuração no painel Supabase / CLI): por exemplo `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` para `chat-completion`, além de segredos específicos de integrações (ex.: Judit).

---

## Stack (resumo)

| Camada | Tecnologias |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite 5, react-router-dom v6 |
| UI | shadcn/ui (Radix), Tailwind CSS, TipTap, recharts |
| Dados / cache | TanStack Query v5, Supabase JS |
| Formulários | react-hook-form, Zod |
| Backend | Supabase (Postgres, RLS, Auth, Realtime, Edge Functions) |
| Integrações | N8N (agentes/leads), Judit (processos) |

**Aliases:** `@/*` → `src/*`; `~shared/*` → `shared/*`.

**TypeScript:** o repositório usa **strictness relaxada** (`noImplicitAny` e `strictNullChecks` desligados) por decisão do projeto — veja `tsconfig.json`.

---

## Estrutura do repositório

```text
src/
  App.tsx              # Rotas e React Query
 components/          # UI compartilhada, layout, assistentes, payroll…
  config/              # Agentes N8N (aiAgents.ts)
  contexts/            # Auth, etc.
  features/            # leads, legal-kanban, processes
  pages/               # Rotas de alto nível
  services/            # Supabase, chat, payroll, N8N…
shared/types/          # Tipos compartilhados (payroll, company, sped)
supabase/
  functions/           # chat-completion, judit-*, admin-*, download-file…
  migrations/          # Schema e RLS
docs/                  # Documentação de projeto e implementações
```

---

## Rotas principais

Rotas protegidas usam `AppLayout` e `ProtectedRoute` (exceto `/login`). Resumo:

| Área | Caminhos (exemplos) |
|------|----------------------|
| Auth | `/login` |
| Dashboard | `/` |
| Assistentes LLM | `/assistants/chat`, `/assistants/tax`, `/assistants/civil`, `/assistants/financial`, `/assistants/accounting` |
| Biblioteca N8N | `/assistants/library`, `/assistants/library/:themeId`, `/assistants/library/agent/:agentId` |
| Documentos | `/documents/payroll`, `/sped`, `/cases`, `/cases/kanban`, `/cases/queries`, `/cases/:caseId`, `/reports` |
| Integrações | `/integrations/powerbi`, `/integrations/calendar` |
| Leads | `/leads`, `/leads/templates` |
| Empresas | `/companies` (permissão `companies`), `/companies/:id/payrolls` |
| Admin | `/admin`, `/admin/users` (permissão `admin`) |
| Testes | `/test`, `/test/payroll-workflow` |

Detalhes e tabelas completas: [`docs/Documentacao-PRJ.md`](docs/Documentacao-PRJ.md).

---

## Controle de acesso (RBAC)

Perfis definem permissões em `AuthContext` (`hasPermission` / `ProtectedRoute`):

| Papel | Resumo |
|-------|--------|
| `administrator`, `it`, `advogado_adm` | Acesso amplo (`admin`, `users`, `companies`, `modules`, `all`) |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` |

Regras adicionais: usuário deve estar **`ativo`**; **primeiro acesso** pode exigir troca de senha; sessão encerra após **30 minutos** de inatividade.

---

## Supabase (referência rápida)

- **Edge Functions** (em `supabase/functions/`): entre outras — `chat-completion`, `download-file`, `admin-create-user`, `admin-update-user-password`, `judit-processes`, `judit-process-agent`, `judit-consumption-report`.
- **Migrações:** `supabase/migrations/` — usar sempre migrações versionadas e políticas **RLS** coerentes.

---

## Documentação complementar

- [`CLAUDE.md`](CLAUDE.md) — guia de desenvolvimento (build, padrões, Supabase).
- [`docs/`](docs/) — implementações por data, APIs Judit, integrações, etc.

---

## Segurança

- Não commite `.env` nem chaves de API.
- Dados sensíveis dependem de **RLS** no Postgres; novas tabelas devem seguir o mesmo rigor.
