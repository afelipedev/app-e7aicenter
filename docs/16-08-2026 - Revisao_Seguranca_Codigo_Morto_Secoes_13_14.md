# 16/08/2026 - Revisão de Segurança, Código Morto e Pontos de Atenção (§13/§14)

> Escopo: aplicar as correções cabíveis das seções **13 (Pontos de atenção e inconsistências)** e **14 (Melhorias futuras)** de `docs/Documentacao_Final_Tecnica.md` (gerada em 14/08/2026), sem impactar a usabilidade atual. Investigação feita com Explore agents (código) + Supabase MCP (banco, somente leitura antes de cada mudança).

## 1. Segurança de banco de dados (Supabase)

### 1.1 `sync_event_ledger` sem RLS — resolvido (era o único alerta ERROR)
Confirmado que a tabela só é escrita por `supabase/functions/teams-kanban-bridge/index.ts` e `kanban-card-bridge/index.ts`, ambos via client `service_role` (que ignora RLS). RLS habilitada sem políticas para `anon`/`authenticated` — zero impacto de uso, fecha o alerta `rls_disabled_in_public`.

Migration: `enable_rls_sync_event_ledger`.

### 1.2 Funções `SECURITY DEFINER` executáveis por `anon` — de 85 para 1
Antes de qualquer alteração, foi confirmado (grep em `src/`) que nenhuma função customizada é chamada via `.rpc()` antes do login, **exceto `log_auth_event`** (chamada em `AuthContext.tsx::signIn`, antes da sessão existir) — essa foi mantida acessível para `anon` intencionalmente.

Duas migrations aplicadas:
- `harden_security_definer_functions_execute_grants`: revoga `EXECUTE` de 28 funções de trigger puro (`notify_*`, `kanban_sync_linked_*`, `auto_join_general_channel`, `bump_post_last_activity`, `prevent_last_owner_removal`, `handle_new_user`, etc.) de `anon`, `authenticated` **e** `public` — triggers disparam independentemente do privilégio EXECUTE do role, então revogar de todos é seguro (mesmo padrão de `20260715130300_harden_trigger_functions_revoke_execute.sql`). Também revoga `EXECUTE` de `anon` em ~57 funções RPC/RLS-helper (kanban, teams, tutoriais, relatórios, primeiro acesso).
- `fix_security_definer_public_grant`: correção complementar. A primeira migration revogou de `anon` mas não de `public` — e como o Postgres concede `EXECUTE` a `PUBLIC` por padrão na criação da função, `anon` ainda herdava acesso via `PUBLIC`. Revogado de `PUBLIC` e reconcedido explicitamente a `authenticated` nas ~57 funções, preservando 100% do funcionamento para usuários logados.

Resultado validado com `has_function_privilege()`: `authenticated` mantém acesso a `is_legal_kanban_admin()`, `teams_is_member()`, `report_ai_center_e7()`, `upsert_tutorial_progress()`, etc.; `anon` perdeu acesso a todas exceto `log_auth_event`.

**Alertas do advisor: 177 → 63** (a maior parte do restante, 58 WARNs, é o alerta esperado/informativo de `authenticated_security_definer_function_executable` — funções que usuários logados legitimamente precisam chamar).

### 1.3 Itens que exigem ação manual no dashboard (não migráveis por código)
- `auth_leaked_password_protection` — ativar em Authentication → Policies no dashboard do Supabase.
- `auth_insufficient_mfa_options` — habilitar métodos adicionais de MFA no dashboard.

### 1.4 Risco aceito (documentado, não alterado)
- `extension_in_public` (pgvector no schema `public`): mover de schema quebraria todas as colunas `vector` existentes usadas pelo RAG do AI Center E7 (`documento_fragmentos`). Risco/benefício desfavorável para uma mudança sem impacto prático de segurança neste caso — mantido.

---

## 2. Segurança do frontend — chaves de LLM expostas no bundle

`src/services/llmService.ts` lia `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY` e `VITE_ANTHROPIC_API_KEY` e chamava os provedores diretamente do browser. Confirmado por grep que **nenhum arquivo importava esse serviço** (código morto) — removido. Se essas variáveis fossem preenchidas em produção, vazariam chaves de API no bundle público.

Todo o tráfego de IA em produção já passa pelas Edge Functions (`agente-executar`, `agente-gerar`, `chat-completion`) com chaves no Supabase Vault — nenhum impacto de uso.

---

## 3. Bug de custo zerado (`agente-gerar`) — corrigido

`registrarCusto()` usava `r.modelo` (id **bruto** devolvido pela API, ex. `gpt-4o-2024-08-06`) para buscar o preço em `precos_modelos.modelo` (id **interno** do catálogo, ex. `gpt-4o`) — nunca casava, custo sempre R$ 0,00. Corrigido para usar o id interno já conhecido no momento da chamada (`"gpt-4o"`), replicando o padrão já correto de `agente-executar/index.ts`. Deploy da função aplicado (v4).

Também foram inseridos os 6 modelos do catálogo (`src/config/llmModels.ts`) que não tinham linha em `precos_modelos` (8 de 14 cobertos antes desta correção), com preços pesquisados nesta sessão:

| modelo | preço entrada (US$/1k) | preço saída (US$/1k) |
|---|---|---|
| `gpt-4-turbo` | 0.005000 | 0.015000 |
| `gpt-4` | 0.030000 | 0.060000 |
| `gemini-3.5-flash` | 0.001500 | 0.009000 |
| `gemini-3.1-flash-lite` | 0.000250 | 0.001500 |
| `gemini-2.5-pro` | 0.001250 | 0.010000 |
| `claude-sonnet-4.5` | 0.003000 | 0.015000 |

*(Fora de escopo desta rodada, só documentado: embeddings/OCR/extração de texto ainda não são contabilizados em `agente_execucoes` — é uma melhoria de instrumentação maior, não um bug pontual.)*

---

## 4. Limpeza de código morto — frontend

Removidos (zero import fora do próprio arquivo, confirmado por grep + `npm run build` passando limpo depois):
- `src/services/llmService.ts` (ver §2)
- `src/components/TestFirstAccess.tsx` — não roteado e já quebrado (chamava um método que não existe mais em `userSyncService.ts`)
- `src/components/payroll/ProcessingHistoryTable.tsx`
- `src/components/payroll/ProcessingStatusCard.tsx`
- `src/components/payroll/RealTimeStatusTracker.tsx`
- `src/components/payroll/SecurityScanAlert.tsx`
- `src/components/payroll/FileValidationAlert.tsx`
- `src/pages/integrations/` — diretório vazio, resíduo de Power BI/Calendário já removidos da navegação.

**Não alterado** (decisão do usuário / uso confirmado): `n8nAgentService.ts`/`aiAgents.ts` (biblioteca de 52 agentes, ativa), rotas `/assistants/*` (ativas, fora do menu — mantidas como estão, sem decisão de descontinuação nesta rodada), `message_templates*` (tem 6 registros).

---

## 5. Limpeza de banco de dados — tabelas órfãs

Removidas via migration `drop_orphan_tables`:
- `rag_documents` (0 linhas, sem referência em `src/`)
- `extracted_rubrics` (0 linhas, sem referência em `src/`)
- `_backup_judit_snapshots_20260729` (433 linhas — backup da migração Judit→DataJud concluída em `20260729120000_purge_judit_legacy_process_data.sql`)
- `_backup_judit_query_requests_20260729` (8 linhas, mesmo motivo)

**Não removido:** `message_templates`, `message_template_categories`, `message_template_placeholders` (têm 6/6/11 registros — módulo de templates de leads foi removido da UI, mas os dados foram preservados).

---

## 6. Rotas legadas — mantidas sem alteração

`/assistants/*` (chats fixos legados) e a biblioteca de 52 agentes n8n continuam funcionais, fora do menu, com histórico já gravado. Por decisão explícita do usuário, nenhuma rota ou item de menu foi alterado nesta rodada — item permanece como registro para decisão futura do time.

---

## Resumo executivo

| Item | Status |
|---|---|
| RLS `sync_event_ledger` | ✅ Habilitada (sem policy — só service_role acessa) |
| `EXECUTE` de `anon` em funções `SECURITY DEFINER` | ✅ 85 → 1 (só `log_auth_event`, intencional) |
| Alertas de segurança do advisor | ✅ 177 → 63 |
| Chaves de LLM expostas no bundle (`llmService.ts`) | ✅ Removido (código morto) |
| Bug de custo zerado em `agente-gerar` | ✅ Corrigido + deploy |
| `precos_modelos` incompleto (8/14) | ✅ 14/14 modelos com preço |
| Componentes órfãos do frontend | ✅ 6 arquivos + 1 diretório removidos |
| Tabelas órfãs do banco | ✅ 4 tabelas removidas (2 vazias + 2 backups já purgados) |
| MFA / proteção de senha vazada | ⚠️ Pendente — ação manual no dashboard Supabase Auth |
| `pgvector` no schema `public` | ⚠️ Risco aceito — mover quebraria o RAG |
| Rotas legadas `/assistants/*` | ➖ Mantidas sem alteração (decisão do usuário) |

## Verificação realizada
- `npm run build` — build de produção sem erros após remoção do código morto.
- `mcp__supabase__get_advisors(type: "security")` — confirmado 177 → 63 alertas.
- `has_function_privilege()` — confirmado que `authenticated` mantém acesso às RPCs necessárias e `anon` perdeu acesso a todas exceto `log_auth_event`.
- Deploy da Edge Function `agente-gerar` (v4, ACTIVE) com a correção de custo.
