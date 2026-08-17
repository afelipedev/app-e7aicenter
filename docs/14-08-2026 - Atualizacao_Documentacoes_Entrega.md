# 14/08/2026 — Atualização das documentações de entrega

Revisão completa dos quatro documentos de entrega ao cliente, alinhando-os à estrutura atual da aplicação. **Nenhum código foi alterado** — apenas documentação.

## Arquivos atualizados

| Arquivo | Público | Versão |
|---------|---------|--------|
| `docs/Documentacao_Final_Cliente.md` | Usuários e gestores | 2.0 |
| `docs/Documentacao_Final_Tecnica.md` | Desenvolvimento e manutenção | 14/08/2026 |
| `docs/Documentacao-PRJ.md` | Onboarding / fonte do README | 14/08/2026 |
| `docs/Documentacao_E_Tutorial.html` | Portal navegável (cliente + técnico) | 2.0 |

## Levantamento que embasou a revisão

- `src/App.tsx` (rotas), `src/components/layout/AppSidebar.tsx` (menu), `src/contexts/AuthContext.tsx` (RBAC).
- `src/features/*` — 13 módulos; `src/config/llmModels.ts` (14 modelos) e `aiAgents.ts` (52 agentes n8n).
- `supabase/functions/*` — 19 Edge Functions ativas (confirmadas via MCP `list_edge_functions`).
- Banco remoto via MCP: 89 tabelas (88 com RLS), 109 funções próprias, 84 triggers, 0 views, 11 buckets.
- `get_advisors(security)`: 177 alertas — 1 ERROR (`sync_event_ledger` sem RLS), 171 WARN de `EXECUTE` em funções `SECURITY DEFINER`, 2 INFO nas tabelas de backup do Judit.
- Notas datadas de 24/07, 27/06 e 29/07/2026 (AI Center E7, Tutoriais, Configurações, Relatórios).

## O que mudou de fato no conteúdo

**Módulos que não existiam nas versões anteriores dos documentos**
- **AI Center E7** — criação, publicação e execução de agentes; RAG com pgvector; construtor visual (React Flow); versões e custos em R$.
- **Tutoriais** — videoteca com progresso, favoritos e upload resumível (TUS).
- **Relatórios** — hub com 4 abas e agregação em RPCs do Postgres.
- **Configurações do sistema** — webhooks, parâmetros de LLM e credenciais no Supabase Vault.
- **Gestão Operacional** — quadros no domínio `operational`.

**Correções de fatos desatualizados**
- `/documents/reports` não é mais placeholder (a versão anterior da doc técnica dizia que era).
- Rotas `/test`, `/test/payroll-workflow`, `/integrations/*` e `/leads/templates` **não existem mais**.
- `/assistants/*` e a Biblioteca de IA (52 agentes n8n) continuam roteados, mas **fora do menu lateral** — registrado como legado.
- Holerite passou a ser **assíncrono**, com retorno via `payroll-processing-callback` (segredo compartilhado com o n8n).
- Catálogo de modelos LLM centralizado em `config/llmModels.ts` (14 modelos), substituindo a lista antiga de 5.
- Chaves de IA migradas para o **Vault**; env vars continuam apenas como fallback nas Edge Functions.
- Advisor `function_search_path_mutable` (27 ocorrências na análise anterior) foi **zerado**.

**Pontos de atenção registrados na doc técnica (§13)**
1. `sync_event_ledger` sem RLS (único ERROR do advisor).
2. `src/services/llmService.ts` lê `VITE_OPENAI_API_KEY` / `VITE_GEMINI_API_KEY` / `VITE_ANTHROPIC_API_KEY` — vão para o bundle do navegador; recomendado remover.
3. `precos_modelos` cobre 8 dos 14 modelos, e `agente-gerar` envia id versionado que nunca casa — custo gravado como R$ 0,00 nesses casos.
4. Embeddings, OCR e `extrair-texto` não são contabilizados em `agente_execucoes`.
5. Lead time do Kanban com amostra mínima (cards arquivados não preenchem `completed_at`).
6. Resíduos: `message_template*`, `rag_documents`, `extracted_rubrics`, backups `_backup_judit_*`, 15 scripts de fix sem versionamento.

## Portal HTML — redesenho

Direção visual de **dossiê institucional**, aplicando as skills `frontend-design` e `ui-ux-pro-max`:

- **Tipografia:** Fraunces (display) + Public Sans (texto) + IBM Plex Mono (rótulos, rotas e código), com fallback local caso o Google Fonts não carregue.
- **Paleta:** papel quente + tinta navy + acento âmbar de carimbo; tema claro/escuro com tokens espelhados e `prefers-color-scheme` como padrão.
- **Elemento característico:** folha de rosto com selo de entrega e grade de identificação do documento (Documento / Versão / Emissão / Destinatário / Plataforma).
- **Estrutura numerada (§1–§11)** — a numeração serve à referência cruzada entre os quatro documentos.
- **Funcional:** busca instantânea com realce (`Ctrl`/`⌘` + `K`), sumário com seção ativa, menu responsivo, skip link, foco visível, `prefers-reduced-motion` respeitado, diagramas Mermaid com tema sincronizado e fallback textual offline, e impressão que abre todos os acordeões.

## Verificação

- Estrutura HTML balanceada (12 `section`, 23 `details`, 8 `table`, 91 `div`).
- Dados numéricos conferidos diretamente no banco remoto e no `package.json` na data da revisão.
- Nenhum arquivo em `src/` ou `supabase/` foi modificado.
