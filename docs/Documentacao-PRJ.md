# Documentação do Projeto — E7AI Center

**Objetivo deste arquivo:** servir como **fonte única de verdade** para redigir ou atualizar o `README.md` do repositório (visão geral, stack, como rodar, módulos e convenções), sem substituir o detalhamento de implementações já existentes em `docs/`.

**Última revisão orientada ao código:** 18/05/2026.

---

## 1. Visão geral do produto

O **E7AI Center** é uma aplicação web (SPA) em React voltada a **escritórios de advocacia e contabilidade**. Entrega:

- **Assistentes de IA** para consultas jurídicas, tributárias, civis, financeiras e contábeis.
- **Biblioteca de agentes** orquestrados via **N8N** (dezenas de agentes agrupados por tema).
- **Gestão documental** com foco em **folha de pagamento (holerite)** e **SPED**, além de fluxos de **processos judiciais** (consultas, detalhes) e **kanban jurídico**.
- **CRM de leads** (cadastro, importação/exportação, templates, mensageria via integração N8N onde aplicável).
- **Administração** de usuários e **empresas clientes** com controle de acesso por perfil.
- **Integrações** externas expostas na UI (ex.: Power BI, calendário).

O backend principal é **Supabase** (PostgreSQL, Auth, Realtime, Storage, Edge Functions), com integrações adicionais por webhooks (N8N, Judit em fluxos de processos).

---

## 2. Stack tecnológica

### 2.1 Frontend

| Camada | Tecnologia |
|--------|------------|
| Runtime / bundler | **Vite 5** (`@vitejs/plugin-react-swc`) |
| UI | **React 18** + **TypeScript** |
| Roteamento | **react-router-dom** v6 |
| Estilo | **Tailwind CSS 3** + **tailwindcss-animate** + **@tailwindcss/typography** |
| Componentes | **shadcn/ui** (primitivas **Radix UI**) |
| Estado remoto / cache | **TanStack React Query** v5 (`staleTime` 5 min, `gcTime` 10 min, retries com backoff) |
| Formulários | **react-hook-form** + **Zod** + **@hookform/resolvers** |
| Gráficos / virtualização | **recharts**, **@tanstack/react-virtual** |
| Editor rico | **TipTap** (extensões diversas; usado em leads e kanban) |
| Drag-and-drop | **@dnd-kit** |
| Temas | **next-themes** (integração com componentes UI) |
| Toasts | **sonner** + toaster shadcn |
| Auth UI (login) | **@supabase/auth-ui-react** |

**Aliases de importação:**

- `@/*` → `src/*`
- `~shared/*` → `shared/*` (tipos compartilhados, ex.: payroll, company, sped)

**Servidor de desenvolvimento:** host `::`, **porta 8081** (`vite.config.ts`).

### 2.2 Backend e dados

| Item | Tecnologia |
|------|------------|
| BaaS | **Supabase** (`@supabase/supabase-js`) |
| Banco | **PostgreSQL** (migrations em `supabase/migrations/`) |
| Auth | Supabase Auth + perfis na tabela `users` |
| Funções serverless | **Edge Functions** (Deno) em `supabase/functions/` |
| Segurança de dados | **RLS** (Row Level Security) nas tabelas sensíveis |

### 2.3 Orquestração e integrações

- **N8N:** webhooks para agentes da biblioteca e serviços de leads (`VITE_N8N_WEBHOOK_DINAMICO` e URLs por agente em `src/config/aiAgents.ts`).
- **Judit:** integração de processos (consultas, consumo, relatórios) — ver `src/features/processes/` e funções `judit-*` em `supabase/functions/`.
- **LLMs:** chat “padrão” via Edge Function `chat-completion` (OpenAI, Gemini, Anthropic conforme variáveis de ambiente na função).

### 2.4 TypeScript

O projeto usa **strictness relaxada** de propósito (`noImplicitAny: false`, `strictNullChecks: false` em `tsconfig.json`) para compatibilidade com o código legado — documentar isso em README evita expectativas incorretas de strict mode.

---

## 3. Estrutura de pastas (alto nível)

```text
app-e7aicenter/
├── src/
│   ├── App.tsx                 # Rotas e QueryClientProvider
│   ├── components/             # UI compartilhada, layout, payroll, assistants...
│   ├── config/                 # Ex.: aiAgents.ts (temas e agentes N8N)
│   ├── contexts/               # AuthContext, etc.
│   ├── features/               # Módulos por domínio (ver §4)
│   ├── hooks/                  # Hooks globais
│   ├── lib/                    # Supabase client, utilitários
│   ├── pages/                  # Páginas roteadas (assistants, documents, admin...)
│   └── services/               # Camada de serviço (Supabase, LLM, N8N, payroll...)
├── shared/
│   └── types/                  # Tipos compartilhados (payroll, company, sped)
├── supabase/
│   ├── functions/              # Edge Functions (chat-completion, judit-*, admin-*, download-file)
│   └── migrations/             # Histórico de schema RLS e features
├── docs/                       # Documentação de implementações e APIs (este arquivo)
├── public/
├── package.json
├── vite.config.ts
└── README.md                   # Pode espelhar §§ 1–8 deste documento de forma resumida
```

### 3.1 Padrão de features (`src/features/`)

Módulos atuais (exemplos):

| Pasta | Responsabilidade |
|-------|------------------|
| `leads/` | CRUD leads, templates, importação CSV, componentes de formulário, N8N messaging |
| `legal-kanban/` | Board kanban jurídico, rich text, persistência via serviço dedicado |
| `processes/` | Consultas processuais, detalhes de caso, integração Judit/adapters |

Convenção recomendada para novas features: `components/`, `hooks/`, `pages/`, `services/`, `types.ts`, `utils/`.

### 3.2 Camada de serviços (`src/services/`)

Serviços estáticos centralizam acesso ao Supabase e integrações, em geral com **timeout** e tratamento de erro padronizado:

- `chatService.ts` — chats e modelos LLM
- `companyService.ts` — empresas
- `payrollService.ts` — folha / processamento
- `spedService.ts` — SPED
- `userService.ts` / `firstAccessService.ts` / `userSyncService.ts` — usuários e primeiro acesso
- `n8nAgentService.ts` — chamadas webhook N8N
- `llmService.ts` — interações LLM quando aplicável

---

## 4. Funcionalidades por área e rotas

Rotas definidas em `src/App.tsx` (prefixo base: app autenticada com `AppLayout`).

### 4.1 Autenticação e shell

| Rota | Descrição |
|------|-----------|
| `/login` | Login público (Supabase Auth UI) |
| `/*` (demais com layout) | `ProtectedRoute` + `AppLayout`; exige sessão válida |

**Regras de negócio comuns:**

- Usuário com `status` diferente de **`ativo`** não deve usar o app (tratado no fluxo de auth/perfil).
- **Primeiro acesso:** troca de senha obrigatória (`FirstAccessGuard` / serviços de primeiro acesso).
- **Sessão:** encerramento por **inatividade de 30 minutos** (`AuthContext`).

### 4.2 Dashboard e home

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard principal |

### 4.3 Assistentes (chat LLM via Supabase)

Chats “clássicos” usam a Edge Function **`chat-completion`** com seleção de modelo por conversa.

| Rota | PÁGINA |
|------|--------|
| `/assistants/chat` | Chat geral |
| `/assistants/tax` | Direito tributário |
| `/assistants/civil` | Direito civil |
| `/assistants/financial` | Financeiro |
| `/assistants/accounting` | Contábil |

**Realtime:** mensagens e chats podem usar **Supabase Realtime** (hooks como `useChatHistory` deduplicam mensagens).

### 4.4 Biblioteca de agentes (N8N)

| Rota | Descrição |
|------|-----------|
| `/assistants/library` | Grade de temas |
| `/assistants/library/:themeId` | Agentes por tema |
| `/assistants/library/agent/:agentId` | Chat do agente específico (`AgentChat`) |

**Temas:** 11 categorias em `AgentTheme` (ex.: criação de peças, jurisprudência, contratos, marketing jurídico, áreas do direito). Agentes e URLs de webhook em `src/config/aiAgents.ts`.

### 4.5 Documentos e processos

| Rota | Descrição |
|------|-----------|
| `/documents/payroll` | Upload/gestão de holerites e fluxo de folha |
| `/documents/sped` | SPED |
| `/documents/cases` | Casos / processos (entrada geral) |
| `/documents/cases/kanban` | Kanban jurídico (`LegalKanbanPage`) |
| `/documents/cases/queries` | Consultas processuais (`ProcessQueriesPage`) |
| `/documents/cases/:caseId` | Detalhe do processo (`ProcessDetailsPage`) |
| `/documents/reports` | Relatórios documentais |
| `/payroll/processing/:processingId` | Detalhe de processamento de folha (`PayrollProcessingDetails`) |

### 4.6 Integrações

| Rota | Descrição |
|------|-----------|
| `/integrations/powerbi` | Incorporação / links Power BI |
| `/integrations/calendar` | Integração de calendário |

### 4.7 Leads

| Rota | Descrição |
|------|-----------|
| `/leads` | Lista e gestão de leads |
| `/leads/templates` | Templates de mensagens / comunicação |

### 4.8 Empresas e folha por empresa

| Rota | Permissão |
|------|-----------|
| `/companies` | `ProtectedRoute` com `requiredPermission="companies"` |
| `/companies/:companyId/payrolls` | Gestão de folhas vinculadas à empresa |

### 4.9 Administração

| Rota | Permissão |
|------|-----------|
| `/admin`, `/admin/users` | `requiredPermission="admin"` — gestão de usuários |

### 4.10 Rotas de teste (dev/QA)

| Rota | Uso |
|------|-----|
| `/test` | Página de testes |
| `/test/payroll-workflow` | Fluxo de teste de payroll |

### 4.11 404

| Rota | Descrição |
|------|-----------|
| `*` | `NotFound` |

---

## 5. Controle de acesso (RBAC)

Perfis (`UserRole` em `src/lib/supabase`) e permissões efetivas em `AuthContext`:

| Papel | Permissões típicas (resumo) |
|-------|-----------------------------|
| `administrator`, `it`, `advogado_adm` | `admin`, `users`, `companies`, `modules`, `all` |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` |

Uso no código: `hasPermission('companies')`, `hasPermission('admin')`, etc., e `ProtectedRoute` com `requiredPermission`.

---

## 6. Supabase: funções e tabelas (referência para README)

### 6.1 Edge Functions (pasta `supabase/functions/`)

Inclui, entre outras:

- **`chat-completion`** — completions multi-provedor para chats padrão.
- **`download-file`** — suporte a downloads seguros/arquivos.
- **`admin-create-user`** / **`admin-update-user-password`** — operações administrativas de usuário.
- **`judit-processes`** / **`judit-process-agent`** / **`judit-consumption-report`** — integração Judit (processos e consumo).

Documentação detalhada de contratos deve permanecer nos arquivos `docs/api-judit-docs/` quando existir.

### 6.2 Tabelas e domínios (não exaustivo)

Migraciones cobrem, entre outros: `users`, `companies`, `chats`, `chat_messages`, `payroll_files`, `payroll_processing`, `processing_logs`, módulos **leads**, **legal kanban**, **processos Judit**, **SPED**, primeiro acesso e auditoria.

Para evolução de schema, **sempre** usar migrações versionadas em `supabase/migrations/` e políticas RLS coerentes.

---

## 7. Variáveis de ambiente (frontend)

Valores esperados no **Vite** (prefixo `VITE_`):

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_WEBHOOK_DINAMICO=...   # Webhook dinâmico de agentes N8N
```

**Edge Functions** (configuradas no projeto Supabase, não no Vite): chaves `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, e segredos específicos de integrações (ex.: Judit) conforme cada função.

---

## 8. Comandos de desenvolvimento

```bash
npm install          # Dependências
npm run dev          # Servidor Vite (porta 8081)
npm run build        # Build de produção
npm run build:dev    # Build com modo development (útil para source maps conforme config)
npm run lint         # ESLint
npm run preview      # Servir build de produção localmente
```

---

## 9. Duas linhas de produto de IA (resumo operacional)

1. **Chats padrão:** Edge Function `chat-completion`, modelos configuráveis por chat; manter sincronismo entre `chatService` (`LLMModel`), `ModelSelector`, constraint SQL em `chats.llm_model` e roteamento na função.
2. **Biblioteca N8N:** Configuração declarativa em `aiAgents.ts`; envio de payloads para webhooks; sem estado de modelo no mesmo molde do chat Supabase.

---

## 10. Como usar este documento no README.md

Sugestão de estrutura para o **README público**:

1. Nome do produto + 2–3 frases (§1).
2. Requisitos: Node.js, npm, conta Supabase.
3. Instalação e `npm run dev` (§8) + porta **8081**.
4. Variáveis de ambiente mínimas (§7).
5. Módulos principais com links para pastas (`src/features`, `src/pages`).
6. Stack em tabela curta (§2).
7. Segurança: RLS, perfis (§5), sem commitar `.env`.
8. Link para **`docs/Documentacao-PRJ.md`** como documentação interna completa.

---

## 11. Documentação complementar no repositório

- `CLAUDE.md` (raiz) — orientações de desenvolvimento para assistentes de código.
- `docs/` — registros por data de implementações, APIs Judit, WhatsApp/Uazapi, TipTap, etc.
- `supabase/migrations/README.md` — notas sobre migrações quando existirem.

Este arquivo **não duplica** o conteúdo desses documentos; apenas **indexa** a arquitetura para facilitar o README e o onboarding.
