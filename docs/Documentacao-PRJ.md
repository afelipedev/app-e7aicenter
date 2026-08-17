# Documentação do Projeto — E7 AI Center

**Objetivo deste arquivo:** servir como **fonte única de verdade** para redigir ou atualizar o `README.md` do repositório (visão geral, stack, como rodar, módulos e convenções) e para o onboarding de novas pessoas no time. Não substitui as notas de implementação datadas em `docs/`.

**Última revisão orientada ao código:** 14/08/2026.

---

## 1. Visão geral do produto

O **E7 AI Center** é uma aplicação web (SPA) em React voltada a **escritórios de advocacia e contabilidade**. Entrega:

- **AI Center E7** — plataforma própria onde o usuário **cria, publica e executa agentes de IA** sem programar, com **bases de conhecimento (RAG)** alimentadas por documentos do escritório e construtor visual de fluxo.
- **Gestão documental** de **folha de pagamento (holerites)** e **SPED**, com processamento assíncrono via n8n.
- **Processos judiciais** — consulta na base pública **DataJud/CNJ**, detalhes, movimentações e resumo por IA.
- **Quadros Kanban** em dois domínios: **Jurídico** e **Gestão Operacional**, com bridge entre eles.
- **Equipes** — comunicação interna (canais, postagens, comentários, menções, notificações) sincronizada com os quadros.
- **Relatórios** — hub com 4 abas, agregação em RPCs do Postgres e exportação em Excel.
- **Tutoriais** — videoteca interna com progresso por módulo e área de upload para administradores.
- **Leads (CRM)**, **Empresas clientes**, **Usuários** e **Configurações do sistema** com controle de acesso por perfil.

O backend é integralmente **Supabase** (PostgreSQL + pgvector, Auth, Realtime, Storage, Edge Functions, Vault), com integrações por webhooks (n8n) e a API pública do DataJud.

---

## 2. Stack tecnológica

### 2.1 Frontend

| Camada | Tecnologia |
|--------|------------|
| Runtime / bundler | **Vite 5** (`@vitejs/plugin-react-swc`) |
| UI | **React 18** + **TypeScript 5.8** |
| Roteamento | **react-router-dom** v6 (com `React.lazy` nas rotas pesadas) |
| Estilo | **Tailwind CSS 3** + `tailwindcss-animate` + `@tailwindcss/typography` |
| Componentes | **shadcn/ui** (primitivas **Radix UI**) |
| Estado remoto / cache | **TanStack React Query** v5 (`staleTime` 5 min, `gcTime` 10 min, retries com backoff) |
| Formulários | **react-hook-form** + **Zod** + `@hookform/resolvers` |
| Tabelas / gráficos / virtualização | **@tanstack/react-table**, **recharts**, **@tanstack/react-virtual** |
| Editor rico | **TipTap 3** (kanban e teams) |
| Editor de fluxo | **@xyflow/react** (React Flow) — construtor de agentes |
| Vídeo | **video.js** + **tus-js-client** (upload resumível) |
| Planilhas | **xlsx** (relatórios e leads) |
| Drag-and-drop | **@dnd-kit** |
| Animação | **framer-motion** |
| Temas | **next-themes** (dark/light) |
| Toasts | **sonner** + toaster shadcn |
| Auth UI (login) | **@supabase/auth-ui-react** |
| Testes | **vitest** |

**Aliases de importação:** `@/*` → `src/*` · `~shared/*` → `shared/*`.
**Servidor de desenvolvimento:** host `::`, **porta 8081** (`vite.config.ts`).

### 2.2 Backend e dados

| Item | Tecnologia |
|------|------------|
| BaaS | **Supabase** (`@supabase/supabase-js`) |
| Banco | **PostgreSQL** + **pgvector** (embeddings 1536, índice HNSW) |
| Auth | Supabase Auth (PKCE) + perfis na tabela `users` |
| Funções serverless | **Edge Functions** (Deno) — 19 ativas |
| Arquivos | **Storage** — 11 buckets (privados e públicos) |
| Segredos | **Supabase Vault** para chaves das provedoras de IA |
| Segurança de dados | **RLS** em 88 das 89 tabelas do schema `public` |

### 2.3 Orquestração e integrações

- **n8n:** webhooks de processamento de **holerites** e **SPED**; retorno do holerite chega por callback na Edge Function `payroll-processing-callback`. Endpoints cadastráveis e testáveis em `/admin/settings`.
- **DataJud/CNJ:** provedor ativo de consulta processual (substituiu a Judit). Adapter em `src/features/processes/adapters/processProvider.ts`.
- **LLMs:** OpenAI, Google Gemini, Anthropic e Mistral (OCR), sempre por Edge Function, com chave resolvida no Vault (`_shared/llm.ts`).

### 2.4 TypeScript

O projeto usa **strictness relaxada** de propósito (`noImplicitAny: false`, `strictNullChecks: false` em `tsconfig.json`) por compatibilidade com o código legado — documentar isso no README evita expectativas incorretas de strict mode.

---

## 3. Estrutura de pastas (alto nível)

```text
app-e7aicenter/
├── src/
│   ├── App.tsx                 # Rotas, QueryClientProvider, Providers, React.lazy
│   ├── components/             # UI compartilhada: layout, assistants, payroll, ui (shadcn)
│   ├── config/                 # llmModels.ts (catálogo LLM), aiAgents.ts (agentes n8n legados)
│   ├── contexts/               # AuthContext
│   ├── features/               # Módulos por domínio (ver §3.1)
│   ├── hooks/                  # Hooks globais
│   ├── lib/                    # Cliente Supabase (PKCE), utilitários
│   ├── pages/                  # Páginas roteadas (assistants, documents, admin, leads)
│   └── services/               # Camada de serviço global
├── shared/types/               # Tipos compartilhados (payroll, company, sped)
├── supabase/
│   ├── functions/              # 19 Edge Functions + _shared/llm.ts
│   └── migrations/             # 111 migrations versionadas (+15 scripts de fix legados)
├── docs/                       # Documentação de implementações e APIs (este arquivo)
├── public/
├── package.json
├── vite.config.ts
└── README.md                   # Pode espelhar §§1–8 deste documento
```

### 3.1 Features (`src/features/`)

| Pasta | Responsabilidade |
|-------|------------------|
| `ai-center-e7/` | Galeria, construtor (formulário + React Flow), chat, bases de conhecimento (RAG), configuração dos prompts utilitários |
| `tutorials/` | Catálogo, player Video.js, progresso/favoritos e administração com upload resumível |
| `reports/` | Hub `/documents/reports` (4 abas). Toda agregação em RPCs; rótulos pt-BR em `labels.ts` |
| `system-settings/` | Webhooks, parâmetros de LLM, credenciais de IA (Vault) e custos |
| `legal-kanban/` | Quadros jurídicos (multi-board), colunas, cards, TipTap, filtros, anexos, membros |
| `operational-kanban/` | Quadros de gestão operacional (mesmas tabelas, `domain='operational'`) |
| `kanban-shared/` | `KanbanModuleContext` e peças comuns aos dois domínios |
| `processes/` | Dashboard, consultas e detalhes de processo; adapter `processProvider.ts` |
| `teams/` | Equipes, canais, posts, respostas, reações, menções, favoritos, busca PT-BR, bridge com kanban |
| `leads/` | CRUD de leads, importação/exportação, TipTap |
| `profile/` | Página `/perfil`, avatar, segurança |
| `payroll/` | Formulário de upload em lote e utilitários de webhook |
| `theme/` | `ThemeProvider` e `ThemeToggleButton` |

Convenção para novas features: `components/`, `hooks/`, `pages/`, `services/`, `types.ts`, `utils/`.

### 3.2 Camada de serviços (`src/services/`)

Serviços estáticos centralizam acesso ao Supabase e integrações, com **timeout** e tratamento de erro padronizados:

- `chatService.ts` — chats legados e tipo `LLMModel` (derivado de `config/llmModels.ts`)
- `companyService.ts` — empresas
- `payrollService.ts` / `spedService.ts` — processamento documental
- `userService.ts` / `firstAccessService.ts` / `userSyncService.ts` — usuários e primeiro acesso
- `dashboardService.ts` — indicadores do painel
- `n8nAgentService.ts` — webhooks da biblioteca n8n (legado)
- `llmService.ts` — **legado; lê chaves `VITE_*` no browser e deve ser removido** (ver §9)

Exemplo do padrão:

```typescript
const { data, error } = await withTimeout(
  supabase.from('table').select('*'),
  DEFAULT_TIMEOUT
);
```

---

## 4. Funcionalidades por área e rotas

Rotas definidas em `src/App.tsx`. Tudo fora de `/login` roda dentro de `ProtectedRoute` + `AppLayout`.

### 4.1 Autenticação e shell

| Rota | Descrição |
|------|-----------|
| `/login` | Login público (Supabase Auth UI) |
| demais | `ProtectedRoute` + `AppLayout`; exige sessão válida |

**Regras de negócio comuns:**

- Usuário com `status` diferente de **`ativo`** não acessa o app.
- **Primeiro acesso:** troca de senha obrigatória (`FirstAccessGuard`).
- **Sessão:** encerramento por **inatividade de 30 minutos** (`AuthContext`).

### 4.2 Dashboard

| Rota | Descrição |
|------|-----------|
| `/` | Painel com 5 indicadores e 7 atalhos rápidos |

### 4.3 AI Center E7

| Rota | Descrição |
|------|-----------|
| `/ai-center-e7` | Galeria de agentes (busca, favoritos, arquivados, "Construir com IA") |
| `/ai-center-e7/agentes/novo` | Construtor — abas Geral, Fluxo, Conhecimento, Versões, Custos, Simulação |
| `/ai-center-e7/agentes/:agenteId/editar` | Edição do agente |
| `/ai-center-e7/agentes/:agenteId` | Chat com o agente |
| `/ai-center-e7/conhecimento` | Bases de conhecimento e ingestão de documentos |
| `/ai-center-e7/config` | Prompts dos agentes utilitários — `requiredPermission="admin"` |

### 4.4 Documentos, processos e quadros

| Rota | Descrição |
|------|-----------|
| `/documents/payroll` | Holerites (upload em lote, histórico) |
| `/documents/sped` | SPED |
| `/documents/cases` | Dashboard de processos |
| `/documents/cases/quadros` | Quadros Jurídicos (`KanbanModuleProvider domain="legal"`) |
| `/documents/cases/quadros/:boardSlug` | Quadro jurídico específico |
| `/documents/cases/queries` | Consultas processuais (DataJud) |
| `/documents/cases/:caseId` | Detalhe do processo |
| `/documents/reports` | Hub de relatórios (4 abas) |
| `/payroll/processing/:processingId` | Detalhe de um processamento de folha |
| `/gestao-operacional/quadros` | Quadros operacionais — `requiredPermission="operational_kanban"` |
| `/gestao-operacional/quadros/:boardSlug` | Quadro operacional específico |

### 4.5 Equipes, tutoriais, leads e perfil

| Rota | Descrição |
|------|-----------|
| `/teams`, `/teams/favorites` | Home e favoritos |
| `/teams/:teamSlug/:channelSlug` | Canal |
| `/teams/:teamSlug/:channelSlug/:postId` | Postagem e respostas |
| `/tutoriais`, `/tutoriais/:slug` | Catálogo e reprodução |
| `/leads` | Lista e gestão de leads |
| `/perfil` | Perfil do usuário |

### 4.6 Empresas e administração

| Rota | Permissão |
|------|-----------|
| `/companies` | `requiredPermission="companies"` |
| `/companies/:companyId/payrolls` | Folhas vinculadas à empresa |
| `/admin`, `/admin/users` | `requiredPermission="admin"` |
| `/admin/teams`, `/admin/teams/:teamId` | `requiredPermission="admin"` |
| `/admin/tutoriais` | `requiredPermission="admin"` |
| `/admin/settings` | `requiredPermission="admin"` |

### 4.7 Rotas legadas (ativas, fora do menu)

| Rota | Situação |
|------|----------|
| `/assistants/chat`, `/tax`, `/civil`, `/financial`, `/accounting` | Chats fixos com `chat-completion`; sem item de menu |
| `/assistants/library`, `/assistants/library/:themeId`, `/assistants/library/agent/:agentId` | Biblioteca de 52 agentes n8n; sem item de menu |

> As rotas de teste (`/test`, `/test/payroll-workflow`) e as de integrações (`/integrations/*`, `/leads/templates`) **não existem mais**.

### 4.8 404

| Rota | Descrição |
|------|-----------|
| `*` | `NotFound` |

### 4.9 Menu lateral (`AppSidebar.tsx`)

Dashboard · Leads · Gestão Operacional · Gestão de Empresas · **AI Center E7** · Gestão Jurídica → Processos (Dashboard, Quadros Jurídicos, Consultas Processuais) · Gestão Contábil (Holerites, SPEDs) · Relatórios · Equipes · Tutoriais · Administração (Usuários, Gestão de Equipes, Upload Tutoriais, Configurações).

`filterMenuItems` remove itens sem permissão e grupos que ficariam vazios.

---

## 5. Controle de acesso (RBAC)

| Papel | Permissões |
|-------|------------|
| `administrator`, `it`, `advogado_adm` | `admin`, `users`, `companies`, `modules`, `operational_kanban`, `all` |
| `advogado` | `modules`, `companies` |
| `contabil` | `modules`, `companies`, `view_companies`, `add_companies` |
| `financeiro` | `modules` |

Uso no código: `hasPermission('admin')`, `ProtectedRoute requiredPermission="..."` e `requiredPermission` nos itens do menu. No banco, as políticas RLS repetem a regra por meio de helpers `SECURITY DEFINER`.

---

## 6. Supabase: funções e tabelas (referência)

### 6.1 Edge Functions (`supabase/functions/`)

| Grupo | Funções |
|-------|---------|
| AI Center E7 | `agente-executar`, `agente-gerar`, `conhecimento-ingerir`, `extrair-texto` |
| Assistentes legados | `chat-completion` |
| Processos | `datajud-search`, `datajud-process-agent` |
| Teams | `teams-admin-mutate`, `teams-channel-mutate`, `teams-message-send`, `teams-search`, `teams-kanban-bridge` |
| Kanban | `kanban-card-bridge` |
| Administração | `admin-create-user`, `admin-update-user-password`, `profile-update-email`, `system-settings-mutate` |
| Documentos | `payroll-processing-callback` (sem JWT, autenticada por segredo compartilhado), `download-file` |

Módulo compartilhado `_shared/llm.ts`: roteamento multi-provedor, resolução de chave no Vault, embeddings, OCR e estimativa de custo em R$.

### 6.2 Tabelas e domínios (não exaustivo)

`users`, `companies`, `audit_logs`; **AI Center E7** (`agentes`, `agente_versoes`, `bases_conhecimento`, `documentos`, `documento_fragmentos`, `agente_bases`, `agente_conversas`, `agente_mensagens`, `agente_execucoes`, `precos_modelos`, `configuracoes_ia`); **folha/SPED** (`payroll_*`, `sped_*`, `payslips`, `processing_logs`); **processos** (`process_*`); **kanban** (`legal_kanban_*`, `kanban_card_links`); **teams** (`teams`, `channels`, `posts`, `post_messages`, `notifications`, `post_kanban_links`); **tutoriais** (`tutorials`, `tutorial_*`); **configurações** (`system_*`); **leads** (`leads`, `lead_phones`, `lead_emails`).

Para evolução de schema, **sempre** usar migrações versionadas em `supabase/migrations/` com políticas RLS coerentes. Em trabalho de banco, usar o **MCP/CLI do Supabase**, conforme as regras do projeto.

---

## 7. Variáveis de ambiente (frontend)

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_N8N_WEBHOOK_HOLERITE=...
VITE_N8N_WEBHOOK_SPED_ICMS_IPI=...
VITE_N8N_WEBHOOK_SPED_CONTRIBUICOES=...
VITE_N8N_WEBHOOK_DINAMICO=...      # biblioteca de agentes n8n (legado)
VITE_SPED_S3_BUCKET=...
VITE_SPED_S3_BASE_PATH=...
```

**Edge Functions** (secrets do projeto Supabase, nunca no Vite): `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `DATAJUD_API_KEY`, `PAYROLL_CALLBACK_SECRET`. Em produção, a preferência é o **Vault** — as variáveis de ambiente são apenas fallback.

> ⚠️ Não definir `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY` ou `VITE_ANTHROPIC_API_KEY`: essas variáveis vão para o bundle do navegador (ver §9).

---

## 8. Comandos de desenvolvimento

```bash
npm install          # dependências (algumas libs exigem --legacy-peer-deps)
npm run dev          # servidor Vite (porta 8081)
npm run build        # build de produção
npm run build:dev    # build em modo development
npm run lint         # ESLint
npm run preview      # servir o build localmente
npm test             # Vitest
```

---

## 9. Pontos de atenção para quem for mexer

1. **`src/services/llmService.ts`** lê chaves de IA do bundle do navegador. Todo o tráfego de produção passa pelas Edge Functions — o caminho é remover o serviço e as variáveis `VITE_*_API_KEY`.
2. **`public.sync_event_ledger` está sem RLS.** Habilitar exige criar políticas junto, sob pena de bloquear o fluxo de sincronização Teams ↔ Kanban.
3. **Catálogo de modelos LLM:** ao adicionar um modelo, atualizar `config/llmModels.ts`, o espelho em `chat-completion`, o CHECK de `chats.llm_model` e a tabela `precos_modelos` (senão o custo é gravado como R$ 0,00).
4. **Relatórios agregam no banco.** Mudanças de métrica devem ir para `supabase/migrations/20260729121000_reports_rpc_v2.sql`, não para o front.
5. **Kanban é uma tabela só.** `legal_kanban_*` atende jurídico e operacional pela coluna `domain`; qualquer query precisa filtrá-la.
6. **Rotas legadas** (`/assistants/*`) continuam ativas sem menu — não removê-las sem decidir o destino do histórico em `chats`/`chat_messages`.

---

## 10. Como usar este documento no README.md

Sugestão de estrutura para o **README público**:

1. Nome do produto + 2–3 frases (§1).
2. Requisitos: Node.js, npm, projeto Supabase.
3. Instalação e `npm run dev` (§8) + porta **8081**.
4. Variáveis de ambiente mínimas (§7).
5. Módulos principais com links para pastas (`src/features`, `src/pages`).
6. Stack em tabela curta (§2).
7. Segurança: RLS, perfis (§5), Vault, sem commitar `.env`.
8. Link para **`docs/Documentacao-PRJ.md`** (interna completa) e **`docs/Documentacao_Final_Tecnica.md`** (referência técnica de entrega).

---

## 11. Documentação complementar no repositório

- `CLAUDE.md` (raiz) — orientações de desenvolvimento para assistentes de código.
- `docs/Documentacao_Final_Cliente.md` — manual do usuário final.
- `docs/Documentacao_Final_Tecnica.md` — documentação técnica de entrega.
- `docs/Documentacao_E_Tutorial.html` — portal navegável (cliente + técnico).
- `docs/` — notas datadas por implementação (AI Center E7, Tutoriais, Relatórios, Configurações, segurança do Kanban, migração DataJud etc.).
- `docs/api-datajud-cnj/` — documentação da API ativa de processos. `docs/api-judit-docs/`, `docs/docs_old/` e `docs/Integracao WPP - Uazapi/` são **históricos**.

Este arquivo **não duplica** esses documentos; apenas **indexa** a arquitetura para facilitar o README e o onboarding.
