# E7AI Center

Aplicação web (**React** + **Vite**) para **escritórios de advocacia e contabilidade**. Centraliza assistentes de IA, gestão documental (holerite, SPED), processos judiciais (integração **Judit**), kanban jurídico, CRM de leads, colaboração em equipes (estilo Slack/Teams), perfil de usuário e administração com **RBAC**.

**Backend principal:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions). **Orquestração externa:** webhooks **N8N** (biblioteca de agentes e mensageria de leads).

Documentação detalhada: [`docs/Documentacao-PRJ.md`](docs/Documentacao-PRJ.md).

---

## Principais funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Assistentes LLM** | Chats por área (geral, tributário, civil, financeiro, contábil) via Edge Function `chat-completion` |
| **Biblioteca de agentes** | **52 agentes** em **11 temas**, orquestrados via **N8N** (`src/config/aiAgents.ts`) |
| **Documentos** | Holerites (folha), **SPED**, relatórios; detalhe de processamento em `/payroll/processing/:id` |
| **Processos** | Dashboard, consultas processuais, detalhes de casos — integração **Judit** (`src/features/processes/`) |
| **Kanban jurídico** | Quadros com colunas, cards, TipTap, anexos, membros (`src/features/legal-kanban/`) |
| **Equipes** | Equipes e canais, postagens, threads, reações, menções, favoritos, busca PT-BR (`src/features/teams/`) |
| **Leads** | CRUD, templates, importação/exportação CSV, mensageria N8N (`src/features/leads/`) |
| **Perfil** | Dados pessoais, avatar, troca de senha (`src/features/profile/`, rota `/perfil`) |
| **Empresas e admin** | Gestão de empresas clientes e usuários com **RBAC** |
| **Integrações** | Power BI e calendário na UI |

---

## Requisitos

- **Node.js** e **npm** (recomendado gerenciar versão com [nvm](https://github.com/nvm-sh/nvm))
- Projeto **Supabase** configurado (URL, chave anônima)
- Edge Functions e secrets configurados para chat, admin, Judit e Equipes

---

## Como rodar localmente

```bash
git clone <URL_DO_REPOSITORIO>
cd app-e7aicenter
npm install
npm run dev
```

O servidor de desenvolvimento sobe em **http://localhost:8081** (host `::`, porta em `vite.config.ts`).

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (Vite, hot reload) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development (source maps) |
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

**Edge Functions** (painel Supabase / CLI): `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` para `chat-completion`; segredos Judit para `judit-*`; demais secrets por função.

---

## Stack

| Camada | Tecnologias |
|--------|-------------|
| Build | Vite 5, `@vitejs/plugin-react-swc` |
| Frontend | React 18, TypeScript, react-router-dom v6 |
| UI | shadcn/ui (Radix), Tailwind CSS 3, TipTap, recharts, `@dnd-kit` |
| Estado / cache | TanStack Query v5 (stale 5 min, gc 10 min, retry c/ backoff) |
| Formulários | react-hook-form, Zod, `@hookform/resolvers` |
| Temas / toasts | next-themes, sonner |
| Auth (login) | `@supabase/auth-ui-react` |
| Backend | Supabase (Postgres, RLS, Auth, Realtime, Storage, Edge Functions) |
| Integrações | N8N (agentes/leads), Judit (processos) |

**Aliases:** `@/*` → `src/*`; `~shared/*` → `shared/*`.

**TypeScript:** strictness relaxada por decisão do projeto (`noImplicitAny: false`, `strictNullChecks: false`) — ver `tsconfig.json`.

---

## Estrutura do repositório

```text
app-e7aicenter/
├── src/
│   ├── App.tsx                    # Rotas, QueryClientProvider, ThemeProvider
│   ├── components/                # UI compartilhada (layout, payroll, assistants, modais admin…)
│   │   ├── layout/                # AppLayout, AppSidebar, Header
│   │   ├── assistants/            # ChatSidebar, ModelSelector, AgentCard…
│   │   ├── payroll/               # Upload, processamento, status em tempo real
│   │   └── ui/                    # shadcn/ui (primitivas Radix)
│   ├── config/
│   │   └── aiAgents.ts            # 11 temas, 52 agentes N8N e webhooks
│   ├── contexts/
│   │   └── AuthContext.tsx        # Sessão, RBAC, primeiro acesso, inatividade
│   ├── features/                  # Módulos por domínio (ver tabela abaixo)
│   ├── hooks/                     # useChatHistory, usePermissions, useProcessingUpdates…
│   ├── lib/                       # Cliente Supabase, utils, tipos de usuário
│   ├── pages/                     # Páginas roteadas (assistants, documents, admin…)
│   └── services/                  # Camada de serviço (Supabase + integrações)
├── shared/types/                  # Tipos compartilhados (payroll, company, sped)
├── supabase/
│   ├── functions/                 # Edge Functions (Deno)
│   └── migrations/                # Schema, RLS e evolução de features
├── docs/                          # Documentação de projeto e implementações
├── public/
├── package.json
├── vite.config.ts
├── README.md
└── CLAUDE.md                      # Guia para assistentes de código
```

### Módulos de features (`src/features/`)

| Pasta | Responsabilidade |
|-------|------------------|
| `leads/` | CRUD de leads, templates, CSV import/export, TipTap, mensageria N8N |
| `legal-kanban/` | Quadros jurídicos, colunas/cards, editor TipTap, filtros, anexos, membros |
| `processes/` | Dashboard processual, consultas, detalhes, consumo Judit, adapter plugável |
| `teams/` | Equipes e canais, postagens, threads (1 nível), reações, menções, favoritos, busca full-text PT-BR, sync com kanban |
| `profile/` | Página de perfil, avatar, formulários de dados e segurança |
| `payroll/` | Componentes de upload em lote e utilitários de webhook holerite |
| `theme/` | ThemeProvider (dark/light) e toggle de tema |

Convenção para novas features: `components/`, `hooks/`, `pages/`, `services/`, `types.ts`, `utils/`.

### Camada de serviços (`src/services/`)

| Arquivo | Função |
|---------|--------|
| `chatService.ts` | Chats, mensagens, tipos `LLMModel` |
| `companyService.ts` | Empresas clientes |
| `payrollService.ts` | Folha de pagamento e processamento |
| `spedService.ts` | SPED |
| `userService.ts` | Usuários |
| `firstAccessService.ts` | Fluxo de primeiro acesso / troca de senha |
| `userSyncService.ts` | Sincronização auth ↔ perfil |
| `n8nAgentService.ts` | Webhooks N8N (biblioteca de agentes) |
| `llmService.ts` | Interações LLM |
| `dashboardService.ts` | Dados do dashboard principal |

Padrão comum: wrapper `withTimeout` em chamadas Supabase.

### Páginas roteadas (`src/pages/`)

| Pasta / arquivo | Conteúdo |
|-----------------|----------|
| `assistants/` | ChatGeneral, TaxLaw, CivilLaw, Financial, Accounting, AILibrary, AgentsByTheme, AgentChat |
| `documents/` | Payroll, Sped, Cases, Reports |
| `integrations/` | PowerBI, CalendarIntegration |
| `leads/` | Leads, Templates |
| `admin/` | Users |
| `Dashboard.tsx`, `Login.tsx`, `Companies.tsx`, `PayrollManagement.tsx` | Shell e gestão |
| `TestPage.tsx`, `TestPayrollWorkflow.tsx` | Rotas de QA |

---

## Rotas (fonte: `src/App.tsx`)

Rotas protegidas usam `ProtectedRoute` + `AppLayout`, exceto `/login`.

### Autenticação e shell

| Rota | Descrição |
|------|-----------|
| `/login` | Login público (Supabase Auth UI) |
| `/*` (demais) | Sessão válida + layout autenticado |

### Dashboard

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard principal |

### Assistentes LLM (Supabase `chat-completion`)

| Rota | Página |
|------|--------|
| `/assistants/chat` | Chat geral |
| `/assistants/tax` | Direito tributário |
| `/assistants/civil` | Direito civil |
| `/assistants/financial` | Financeiro |
| `/assistants/accounting` | Contábil |

Modelos disponíveis: `gpt-4`, `gpt-4-turbo`, `gpt-5.2`, `gemini-2.5-flash`, `claude-sonnet-4.5`.

### Biblioteca de agentes (N8N)

| Rota | Descrição |
|------|-----------|
| `/assistants/library` | Grade de temas |
| `/assistants/library/:themeId` | Agentes por tema |
| `/assistants/library/agent/:agentId` | Chat do agente (`AgentChat`) |

**Temas (11):** criação de peças, revisão de peças, extração de dados, revisão de textos, estratégia do caso, jurisprudência, atendimento ao cliente, audiência/julgamento, marketing jurídico, contratos, áreas do direito.

### Documentos e processos

| Rota | Descrição |
|------|-----------|
| `/documents/payroll` | Gestão de holerites |
| `/documents/sped` | SPED |
| `/documents/cases` | Dashboard de processos |
| `/documents/cases/quadros` | Lista de quadros kanban |
| `/documents/cases/quadros/:boardSlug` | Board kanban jurídico |
| `/documents/cases/queries` | Consultas processuais |
| `/documents/cases/:caseId` | Detalhe do processo |
| `/documents/reports` | Relatórios documentais |
| `/payroll/processing/:processingId` | Detalhe de processamento de folha |

### Equipes

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/teams` | autenticado | Home de equipes |
| `/teams/favorites` | autenticado | Mensagens favoritas |
| `/teams/:teamSlug/:channelSlug` | autenticado | Canal (lista de postagens) |
| `/teams/:teamSlug/:channelSlug/:postId` | autenticado | Thread da postagem |
| `/admin/teams` | `admin` | Gestão de equipes |
| `/admin/teams/:teamId` | `admin` | Detalhe administrativo da equipe |

### Leads, empresas, perfil e integrações

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/leads` | autenticado | Gestão de leads |
| `/leads/templates` | autenticado | Templates de mensagens |
| `/companies` | `companies` | Gestão de empresas |
| `/companies/:companyId/payrolls` | autenticado | Folhas por empresa |
| `/perfil` | autenticado | Perfil do usuário |
| `/integrations/powerbi` | autenticado | Power BI |
| `/integrations/calendar` | autenticado | Calendário |

### Administração e QA

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| `/admin`, `/admin/users` | `admin` | Gestão de usuários |
| `/test` | autenticado | Página de testes |
| `/test/payroll-workflow` | autenticado | Fluxo de teste payroll |
| `*` | — | NotFound |

---

## Controle de acesso (RBAC)

Perfis em `AuthContext` (`hasPermission`) e `ProtectedRoute` (`requiredPermission`):

| Papel | Permissões |
|-------|------------|
| `administrator`, `it`, `advogado_adm` | `admin`, `users`, `companies`, `modules`, `all` |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` |

**Regras adicionais:**

- Usuário deve estar com `status` **`ativo`**
- **Primeiro acesso:** troca de senha obrigatória (`FirstAccessGuard` / `firstAccessService`)
- **Sessão:** encerramento após **30 minutos** de inatividade
- Edição de e-mail no perfil restrita a papéis em `EMAIL_EDIT_ROLES` (`administrator`, `it`, `advogado_adm`)

---

## Duas linhas de produto de IA

1. **Chats padrão (Supabase):** Edge Function `chat-completion`, modelos por conversa, Realtime via `useChatHistory`. Manter sincronismo entre `chatService` (`LLMModel`), `ModelSelector`, constraint SQL `chats.llm_model` e roteamento na função.

2. **Biblioteca N8N:** Configuração declarativa em `aiAgents.ts`; payloads para webhooks; sem o mesmo fluxo de persistência/modelo dos chats Supabase.

---

## Supabase

### Edge Functions (`supabase/functions/`)

| Função | Propósito |
|--------|-----------|
| `chat-completion` | Completions multi-provedor (OpenAI, Gemini, Anthropic) |
| `download-file` | Download seguro de arquivos |
| `admin-create-user` | Criação administrativa de usuário |
| `admin-update-user-password` | Atualização de senha por admin |
| `judit-processes` | Integração Judit — processos |
| `judit-process-agent` | Agente processual Judit |
| `judit-consumption-report` | Relatório de consumo Judit |
| `teams-admin-mutate` | Mutações administrativas de equipes |
| `teams-channel-mutate` | Mutações de canais |
| `teams-message-send` | Envio de mensagens em postagens |
| `teams-search` | Busca full-text em equipes |
| `teams-kanban-bridge` | Ponte bidirecional Teams ↔ Kanban |
| `profile-update-email` | Atualização de e-mail do perfil |

Documentação Judit: `docs/api-judit-docs/`. DataJud (CNJ): `docs/api-datajud-cnj/`.

### Domínios de dados (referência, RLS)

`users`, `companies`, `chats`, `chat_messages`, `payroll_files`, `payroll_processing`, `processing_logs`, **leads**, **legal kanban** (boards, columns, cards…), **processos Judit**, **SPED**, **teams** (equipes, canais, postagens, mensagens, favoritos, notificações), **perfil** (`user_profile_settings`), primeiro acesso e auditoria.

Evolução de schema: sempre migrações versionadas em `supabase/migrations/`.

---

## Realtime e React Query

- Chats e processamento payroll usam **Supabase Realtime** (`useChatHistory`, `useProcessingUpdates`)
- **QueryClient** (`App.tsx`): stale 5 min, gc 10 min, refetch on focus/reconnect, retry 3 com backoff exponencial (máx. 30 s)

---

## Documentação complementar

| Arquivo | Conteúdo |
|---------|----------|
| [`CLAUDE.md`](CLAUDE.md) | Guia de desenvolvimento para assistentes de código |
| [`docs/Documentacao-PRJ.md`](docs/Documentacao-PRJ.md) | Referência interna de arquitetura |
| [`docs/`](docs/) | Implementações por data, APIs Judit/Uazapi, TipTap, Equipes… |
| [`docs/Implementação_Equipes.md`](docs/Implementação_Equipes.md) | Detalhes do módulo Equipes |

---

## Segurança

- Não commite `.env` nem chaves de API
- **Service role** nunca no browser (`src/lib/supabase.ts` bloqueia uso client-side)
- Dados sensíveis protegidos por **RLS** no Postgres; novas tabelas devem seguir o mesmo rigor
- Auth com fluxo **PKCE** e storage key `e7ai-auth-token`
