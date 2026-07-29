# 24/07/2026 — AI Center E7 (Fase 0 e Fase 1)

Novo módulo **AI Center E7**: centro de inteligência onde o próprio usuário cria,
publica e executa agentes de IA. Roda **somente aplicação + Supabase** (sem n8n),
com conceito de *compilador de agente* — o grafo declarativo é lido por uma Edge
Function que monta o pipeline e chama o LLM. O módulo antigo (`/assistants/*`)
permanece intacto.

## O que foi entregue

### Fase 0 — Fundação
- **Migração** `supabase/migrations/20260724220100_create_ai_center_e7.sql` (aplicada):
  - `CREATE EXTENSION vector` (pgvector) para RAG.
  - Tabelas **em pt-br**: `agentes`, `agente_versoes`, `bases_conhecimento`,
    `documentos`, `documento_fragmentos` (embedding `vector(1536)`, índice HNSW),
    `agente_bases`, `agente_conversas`, `agente_mensagens`, `agente_execucoes`,
    `precos_modelos` (seed de preços por 1k tokens + câmbio p/ custo em R$).
  - Helpers `SECURITY DEFINER`: `agentes_usuario_atual()`, `agentes_is_admin()`,
    `agentes_pode_ler_base()`; RPC `buscar_fragmentos()` (similaridade cosseno).
  - **RLS** por dono, com leitura estendida a agentes/bases publicados para o
    escritório. Bucket privado `agentes-conhecimento`.
- **`supabase/functions/_shared/llm.ts`**: núcleo LLM reutilizável (roteamento
  OpenAI/Gemini/Anthropic, chave via Vault `get_ai_secret`, embeddings, custo R$).

### Fase 1 — CRUD + chat de agentes
- **Edge Function `agente-executar`** (deployada, `verify_jwt`): interpreta a spec
  do agente e executa o pipeline `entrada → memória → RAG → modelo → saída`,
  persistindo mensagem, execução (tokens, custo, trilha).
- **Front** `src/features/ai-center-e7/`: `types.ts`, `utils/grafoCanonico.ts`
  (form N1 ⇄ grafo canônico), `services/agenteService.ts`, páginas
  `GaleriaAgentesPage`, `ConstrutorAgentePage` (form N1 + esqueleto das abas),
  `ChatAgentePage` (reusa `ChatMessage`/`MarkdownContent`).
- **Rotas** em `App.tsx` (`/ai-center-e7`, `/agentes/novo`, `/:id/editar`, `/:id`)
  e novo item de menu **AI Center E7** no `AppSidebar`.

## Verificação
- `npx tsc --noEmit`, `npm run lint` (arquivos novos) e `npm run build`: OK.
- Migração aplicada; `get_advisors` sem novos ERROS (apenas os WARNs de
  `security_definer_function_executable`, padrão já existente no projeto).
- `agente-executar` responde **HTTP 401** sem JWT (viva e protegida).
- **Pendente de teste manual** (requer sessão logada): criar agente pela UI,
  conversar, conferir `agente_mensagens`/`agente_execucoes`.

### Fase 2 — RAG (pgvector + embeddings + OCR)
- **Edge Function `conhecimento-ingerir`** (deployada): baixa o arquivo do bucket,
  extrai texto (**PDF** via `unpdf`, **DOCX** via `jszip`+strip XML, **TXT** nativo,
  **imagem** via OCR com modelo de visão gpt-4o), fragmenta (~3000 chars, overlap
  300), gera embeddings `text-embedding-3-small` e grava `documento_fragmentos`.
  Atualiza `documentos.status` (pendente→processando→concluido/erro).
- **`conhecimentoService.ts`**: CRUD de bases, upload ao bucket + criação do
  documento + disparo da ingestão; listagem/exclusão de documentos.
- **`ConhecimentoPage`** (`/ai-center-e7/conhecimento`): cria bases, envia
  documentos, mostra status com polling; botão na galeria.
- **Aba Conhecimento do Construtor**: vincula bases (RAG) ao agente; `agente-executar`
  já recupera trechos via `buscar_fragmentos` e injeta no system prompt.
- Ajuste de layout: páginas agora `w-full` (estendidas, herdam padding do AppLayout).

### Fase 3 — Construtor visual React Flow
- Instalado `@xyflow/react` (v12). **Biblioteca de nós** (`nodes/catalogo.ts`):
  conjunto fechado por categorias (Entrada, Prompt, Contexto, Conhecimento,
  Memória, Processamento, Ferramentas, Controle, Modelo, Saída).
- **`FluxoEditor`** + **`NoAgente`**: canvas com paleta arrastável, inspetor de
  nó (edita prompt/modelo/rag/memória/saída/http/condição) — na aba **Fluxo**.
- Grafo é a fonte de verdade: form N1 gera grafo canônico; N2 edita direto.
- **Interpretador ciente do grafo** (`agente-executar` v2): lê nós de `modelo`
  (sobrepõe padrão), `rag` (união com `agente_bases`), `saida` (formato) e a
  ferramenta `ferramenta.cnpj` (BrasilAPI, detecta CNPJ na mensagem).

### Fase 4 — Construir com IA + gerador de prompts
- **Edge Function `agente-gerar`**: linguagem natural → spec do agente em JSON
  (nome, persona, modelo, grafo). Modo `prompt` gera só o system prompt.
- Galeria: diálogo **"Construir com IA"** cria rascunho e abre o construtor.
- Construtor: botão **"Gerar com IA"** no campo Persona (usa o objetivo).

### Fase 5 — Governança
- **Publicação**: botão Publicar (rascunho→publicado→escritório) cria snapshot em
  `agente_versoes`. Abas **Versões**, **Custos** (total ~R$, tokens, execuções) e
  **Simulação** (roda mensagem de teste e mostra a trilha do pipeline).

## Status
**MVP completo** (Fases 0–5). Pendente: validação end-to-end manual no app
(sessão logada) e, opcionalmente, OCR de PDF escaneado via Mistral.
