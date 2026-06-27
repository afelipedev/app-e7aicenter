# 27/06/2026 — Auditoria de Segurança — Relatório Técnico

> **Escopo:** auditoria completa de segurança da aplicação **E7AI Center** (React SPA + Supabase + Edge Functions + N8N).
> **Método:** análise estática das migrations/código + verificação **ao vivo** do banco via Supabase MCP (projeto remoto).
> **Princípio condutor:** menor privilégio, mínimo impacto, nenhuma quebra de funcionalidade, alterações pequenas e reversíveis.
> **Status desta entrega:** *somente diagnóstico*. Nenhuma alteração foi aplicada ainda. As correções estão propostas e justificadas; aguardam aprovação.

---

## 0. Sumário Executivo

| # | Achado | Risco | Estado |
|---|--------|-------|--------|
| A | `users_update_all` / `users_delete_all`: **qualquer usuário autenticado** pode alterar/excluir **qualquer** linha de `users` (inclui `role` e `status`) | 🔴 Crítico | Confirmado ao vivo |
| B | Tabelas **SPED** (`sped_files`, `sped_processing`, `sped_files_processing`) com GRANT total a `anon` **e** policies `TO public USING(true)` → **acesso anônimo de leitura/escrita** a dados fiscais | 🔴 Crítico | Confirmado ao vivo |
| C | GRANT amplo a `anon` (ALL) em `users`, `companies`, `payslips`, `audit_logs`, `rubric_patterns`, `processing_logs` (mitigado por RLS nas 5 primeiras, **não** nas SPED) | 🟠 Alto | Confirmado ao vivo |
| D | `audit_logs` INSERT com `WITH CHECK (auth.uid() IS NULL OR auth.uid() IS NOT NULL)` = sempre verdadeiro → **forja de logs** por anon | 🟡 Médio | Confirmado ao vivo |
| E | **27 funções** com `search_path` mutável (17 são `SECURITY DEFINER`) | 🟠 Alto | Confirmado ao vivo |
| F | **66 funções `SECURITY DEFINER`**; revisão de privilégios necessária | 🟡 Médio | Confirmado ao vivo |
| G | Proteção contra **senhas vazadas** (HIBP) e política de senha forte — exige verificação no painel Auth | 🟡 Médio | Requer painel |
| H | **Histórico de migrations poluído**: 41 arquivos tocando `log_auth_event`; 17 arquivos sem timestamp (ordem quebrada) | 🟢 Baixo | Confirmado |
| I | **Código morto**: rotas `/test`, `TestPayrollWorkflow`, migrations de diagnóstico | 🟢 Baixo | Confirmado |
| J | **Ausência total de testes** (sem vitest/jest/cypress/playwright) | 🟡 Médio | Confirmado |
| K | **Divergência de modelos LLM** entre `chatService.ts`, `ModelSelector.tsx`, `chat-completion` e migration | 🟡 Médio | Confirmado |
| L | Buckets públicos (3) | — | **Não alterar** (por instrução) — apenas documentado |

---

## 1. Funções com `search_path` mutável (Item 1)

### Evidência (verificação ao vivo)
- **27 funções** em `public` sem `SET search_path` fixo.
- Destas, **17 são `SECURITY DEFINER`** — as de maior risco, pois rodam com privilégios do *owner* (tipicamente `postgres`).

### Risco
Em uma função `SECURITY DEFINER` sem `search_path` fixo, um atacante que controle um schema na `search_path` da sessão (ex.: criando um objeto homônimo em um schema gravável) pode sequestrar a resolução de nomes (`object hijacking`) e executar código com privilégios elevados (`privilege escalation` / `SQL injection` indireto). É a recomendação oficial do PostgreSQL/Supabase (`Function Search Path Mutable`).

### Funções `SECURITY DEFINER` mutáveis (prioridade alta — corrigir)
`check_first_access_status` (2 assinaturas), `complete_first_access` (2), `create_user_manually`, `diagnose_user_auth_issues`, `get_payroll_stats` (2), `get_processing_stats`, `get_sped_processing_stats`, `get_user_id_from_auth`, `get_users_requiring_first_access`, `receive_processing_result`, `start_payroll_processing`, `start_sped_processing`, `sync_existing_auth_users`, `sync_user_with_auth`.

### Funções mutáveis **não** `SECURITY DEFINER` (risco menor — triggers/utilitárias)
`enforce_users_email_update_permissions`, `kanban_link_sync_begin/end/is_active`, `teams_activity_is_mirror`, `teams_activity_type_is_excluded`, `update_chat_on_message`, `update_company_payslips_count`, `update_updated_at_column`, `validate_cnpj`.

### Correção proposta (mínimo impacto, reversível)
Aplicar **apenas** `ALTER FUNCTION … SET search_path = public, pg_temp;` em cada função — **sem alterar o corpo**. Não muda comportamento funcional; apenas fixa a resolução de nomes. Recomenda-se começar pelas 17 `SECURITY DEFINER`.

```sql
-- exemplo por assinatura (idempotente, sem recriar a função)
ALTER FUNCTION public.start_sped_processing(uuid[], uuid, varchar, varchar)
  SET search_path = public, pg_temp;
```

---

## 2. Funções `SECURITY DEFINER` (Item 2)

### Evidência
- **66 funções `SECURITY DEFINER`** no schema `public`.
- Nenhuma função encontrada que exponha **Service Role Key, API keys ou secrets** — secrets ficam em `Deno.env`/`import.meta.env`; `src/lib/supabase.ts` lança erro se o service role for acessado no browser. ✅
- As funções `SECURITY DEFINER` revisadas operam sobre tabelas de negócio (first-access, payroll, sped, sync de usuário). O risco real está em: (a) `search_path` mutável (item 1) e (b) `GRANT EXECUTE` excessivo a `anon`.

### Risco
`SECURITY DEFINER` é legítimo quando a função precisa contornar RLS de forma controlada (ex.: `receive_processing_result` chamado por webhook). O problema é conceder `EXECUTE` a `anon` em funções que mutam dados de negócio (ex.: `receive_*_processing_result`, `log_auth_event`) — permite que um anônimo dispare efeitos sem autenticação.

### Correção proposta
1. Manter `SECURITY DEFINER` apenas onde há justificativa (bypass de RLS controlado). Não há candidatos óbvios para `SECURITY INVOKER` sem risco de quebra — **recomenda-se não trocar em massa**.
2. Revisar `GRANT EXECUTE … TO anon` caso a caso: webhooks devem ser autenticados via Edge Function (service role) e **não** via `anon` direto no PostgREST. Reduzir o grant de `anon` para `service_role`/`authenticated` onde o fluxo real já passa por Edge Function.
3. Fixar `search_path` (item 1).

> ⚠️ **Requer decisão:** rebaixar `GRANT EXECUTE` de `anon` pode quebrar fluxos que hoje chamam RPCs anonimamente. Mapear chamadas reais antes (ver Plano de Correção).

---

## 3. Políticas RLS `ALWAYS TRUE` (Item 3)

### Evidência (ao vivo)
Políticas que avaliam para `true` incondicional:

| Tabela | Política | Cmd | Papel | Problema |
|--------|----------|-----|-------|----------|
| `sped_files` | view/insert/update | SELECT/INSERT/UPDATE | **public** | anon lê e grava dados fiscais |
| `sped_processing` | view/insert/update | idem | **public** | idem |
| `sped_files_processing` | view/insert | SELECT/INSERT | **public** | idem |
| `processing_logs` | view/insert | SELECT/INSERT | authenticated | qualquer autenticado vê todos os logs |
| `audit_logs` | "Service role can insert" | INSERT | public | `WITH CHECK` sempre verdadeiro (forja de log) |

Além disso, em `users` (RLS ativo, porém permissivo demais):
- `users_select_all` → `auth.uid() IS NOT NULL` (qualquer autenticado lê **todos** os usuários/PII/roles)
- `users_update_all` / `users_delete_all` → `auth.uid() IS NOT NULL` (**qualquer autenticado altera/exclui qualquer usuário**) 🔴

### Risco
- **SPED `TO public`**: exposição anônima de dados fiscais (LGPD) + adulteração.
- **`users_update_all`/`delete_all`**: escalonamento de privilégio (mudar o próprio `role` para `administrator`, desativar outros usuários). **Crítico.**

### Correção proposta (mínimo impacto)
- **SPED**: trocar `TO public` por `TO authenticated` e `USING (auth.role() = 'authenticated')` — alinhado ao padrão já usado em `payslips`/`companies`. A aplicação já opera autenticada, então **sem impacto funcional**.
- **`users_update_all`/`delete_all`**: restringir a "o próprio registro **ou** administrador":
  ```sql
  USING (auth_user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM users u WHERE u.auth_user_id = auth.uid()
                    AND u.role = 'administrator' AND u.status = 'ativo'))
  ```
  Mantém o fluxo de admin (que já existe via Edge Functions `admin-*`) e o auto-update de perfil.
- **`audit_logs` INSERT**: trocar o `WITH CHECK` tautológico por `auth.uid() IS NOT NULL` (ou restringir a `service_role`).

> ⚠️ Validar antes: confirmar que SPED/payroll **não** dependem de chamadas anônimas reais (o processamento passa por Edge Function/N8N com service role, então a hipótese é que `anon` não é necessário).

---

## 4. Buckets Públicos (Item 4) — **NÃO ALTERAR**

Conforme instrução explícita, **nenhuma alteração** foi ou será feita nos buckets públicos.

**Documentação do risco (apenas informativo):** buckets com listagem pública permitem enumeração de objetos por URL. Se houver documentos sensíveis (holerites, SPED, anexos jurídicos) nesses buckets, há risco de vazamento por adivinhação/listagem de chave. Recomendação *futura* (fora deste escopo, requer decisão do cliente): mover conteúdo sensível para bucket privado com download via Edge Function `download-file` (já existe no projeto). **Não implementado por instrução.**

---

## 5. Proteção contra senhas comprometidas (Item 5)

### Evidência
Configuração do Supabase Auth (leaked password protection / HIBP, tamanho mínimo, complexidade) **não é legível via SQL** — fica em `auth.config` no painel. O fluxo de login usa `@supabase/auth-ui-react` (padrão Supabase).

### Correção proposta (baixo impacto)
No painel Supabase → Authentication → Policies:
- Habilitar **"Leaked password protection"** (integração HIBP nativa do Supabase — sem custo, sem código).
- Definir **tamanho mínimo** (≥ 10) e exigir classes de caracteres.
- Manter expiração de sessão de 30 min já implementada (`SESSION_TIMEOUT_MS`). ✅

> ⚠️ Não há API de banco para isso; exige toggle no painel ou Management API. Reutilização de senha não é nativamente suportada pelo Supabase Auth (exigiria custom — **YAGNI**, não recomendado agora).

---

## 6. Limpeza de migrations (Item 6)

### Evidência
- **112 arquivos** em `supabase/migrations/`.
- **41 arquivos** mencionam `log_auth_event` (dezenas de "fix" duplicados: `bulletproof_pgrst202_fix.sql`, `ultimate_*`, `final_*`, `pgrst202_definitive_solution.sql`, …).
- **17 arquivos sem prefixo de timestamp** (`fix_1762102523.sql`, `simple_pgrst202_fix.sql`, `auto_first_access_*.sql`, `test_log_auth_event_function.sql`, …) → quebram a ordenação lexicográfica das migrations.

### Risco
Baixo para runtime (o banco remoto já está no estado final), **mas alto para manutenção/rastreabilidade**: impossível reconstruir o schema de forma determinística a partir do histórico; risco de re-aplicar fix obsoleto.

### Correção proposta
- **Não apagar** migrations já aplicadas no remoto (quebraria `schema_migrations`).
- Estratégia segura: criar uma migration de **consolidação documentada** (squash lógico) que descreve o estado final de `log_auth_event`/`audit_logs`, e mover os arquivos órfãos/obsoletos para `supabase/migrations/_archive/` (fora do path aplicável) com um `README` explicando. Preserva rastreabilidade sem ruído.
- `test_log_auth_event_function.sql` deve sair do diretório de migrations (não é migration).

> ⚠️ Requer decisão: squash exige validar `list_migrations` remoto vs. arquivos locais antes de mexer.

---

## 7. Código morto (Item 7)

| Item | Evidência | Pode remover? | Impacto |
|------|-----------|---------------|---------|
| Rotas `/test`, `/test/payroll-workflow` | `src/App.tsx:179-180`, dentro de `AppLayout` (qualquer autenticado) | **Sim** (ou proteger com `requiredPermission`) | Nenhum em produção; remove superfície exposta |
| `src/pages/TestPage.tsx` (20 linhas), `TestPayrollWorkflow.tsx` (332) | páginas de QA | Sim, se as rotas saírem | Nenhum |
| Integração **Judit** legada | `grep judit` em `src/` → **0 ocorrências** (já migrado p/ DataJud, ver doc 22-06-2026) | Já removida do front | — |
| Edge functions Judit | Não existem mais (`datajud-*` no lugar) ✅ | — | — |
| Templates antigos de leads | `src/features/leads/` ativo e em uso (commit recente) | **Não** — em uso | — |
| Secrets não usados | Nenhum secret hardcoded em `src/` ou `functions/` ✅ | — | — |

### Correção proposta
Remover as 2 rotas de teste e as 2 páginas, **ou** (mais conservador) envolvê-las em `requiredPermission="admin"`. Recomendo **remoção** (YAGNI) — alteração isolada e reversível via git.

---

## 8. Testes (Item 8)

### Evidência
`package.json` **não** contém `vitest`, `jest`, `cypress` nem `playwright`. Não há diretório de testes. Cobertura atual: **0%**.

### Proposta (arquitetura inicial, sem excesso — KISS/YAGNI)
1. **Unit/Integration:** Vitest + `@testing-library/react` (afinidade com Vite). Cobrir primeiro: `usePermissions`, `AuthContext` (RBAC), `processProvider` (adapter), services com `withTimeout`.
2. **E2E (opcional, fase 2):** Playwright — fluxo de login + 1 caminho crítico (ex.: criar lead).
3. Script `npm run test` + `test:watch`. Sem meta de cobertura irreal; alvo inicial **~30%** nos módulos de segurança/RBAC.

> Não implementar suíte completa agora (YAGNI). Apenas estrutura + smoke tests de RBAC.

---

## 9. Biblioteca de Modelos LLM (Item 9)

### Evidência da divergência
| Fonte | Modelos declarados |
|-------|--------------------|
| `chatService.ts` (`LLMModel`) | `gpt-4`, `gpt-4-turbo`, `gpt-5.2`, `gemini-2.5-flash`, `claude-sonnet-4.5` |
| `ModelSelector.tsx` (`MODEL_INFO`) | mesmos 5 |
| `chat-completion/index.ts` | mapeia `gemini-2.5-flash → gemini-2.0-flash-exp` (❌ mismatch), `claude-sonnet-4.5 → claude-3-5-sonnet-20241022` (❌ desatualizado), fallback `gpt-4` |
| Migration `chats.llm_model` CHECK | precisa conferir lista |

Problemas: (a) o id "amigável" não bate com o id real enviado ao provedor; (b) modelos desatualizados (3.5 Sonnet, gemini 2.0 exp); (c) lista duplicada em 4 lugares (viola DRY).

### Correção proposta (centralização — DRY)
Criar **uma fonte única** `src/config/llmModels.ts` (catálogo: id interno, provider, id real do provedor, label, params suportados) e derivar dela:
- o `type LLMModel` (`chatService.ts`),
- o `MODEL_INFO` (`ModelSelector.tsx`),
- o mapeamento na Edge Function (`chat-completion`),
- o CHECK da migration.

Atualizar para linhas atuais (OpenAI, Gemini, Anthropic — Claude Opus/Sonnet/Haiku 4.x). **Manter os ids existentes** para não quebrar chats já gravados (adicionar novos, não remover).

> ⚠️ Mudar o CHECK constraint e a Edge Function exige migration + redeploy coordenados. Sem downtime se feito aditivamente.

---

## 10. Módulo de Configurações do Sistema (Item 10)

### Situação atual
Não existe módulo de configurações. Webhooks N8N estão em `.env` (`VITE_N8N_WEBHOOK_DINAMICO`); credenciais de IA em secrets de Edge Function. Admin atual: `src/pages/admin/` (Users) + `src/pages/Companies.tsx`.

### Proposta de arquitetura (feature-based, alinhada ao CLAUDE.md)
Novo módulo `src/features/system-settings/` + rota `/admin/settings` protegida por **`requiredPermission="admin"`** restrita aos papéis **administrator, it, advogado_adm** (já mapeados no `AuthContext`).

Submódulos:
1. **Webhooks N8N** — CRUD + teste de conectividade (tabela `system_webhooks`, RLS admin-only; teste via Edge Function para não expor URL ao browser desnecessariamente).
2. **Catálogo de Modelos LLM** — editar provider/modelo padrão/temperature/max_tokens/timeout (consome o catálogo do item 9; persistência em `system_llm_settings`).
3. **Credenciais de IA (OpenAI/Gemini/Anthropic)** — **nunca no frontend**. Armazenar como secrets de Edge Function (ou tabela criptografada acessível só por service role); UI mostra apenas valor **mascarado** + botão "validar chave" (Edge Function faz a chamada de teste). Auditoria de alterações em `system_settings_audit`.

> Este item é **desenvolvimento de feature**, não correção de vulnerabilidade. É o maior esforço do escopo e deve ser uma entrega separada, após as correções de segurança (itens 1–3) estarem aplicadas. Requisitos de segurança: tokens só no backend, mascaramento, RLS admin-only, auditoria.

---

# ENTREGÁVEL 2 — Plano de Correção (priorizado)

| Prio | Item | Risco | Esforço | Risco de implantação | Downtime |
|------|------|-------|---------|----------------------|----------|
| P0 | RLS `users_update_all`/`delete_all` → restringir a próprio+admin | 🔴 Crítico | Baixo | Baixo (validar fluxo admin) | Não |
| P0 | SPED policies `TO public` → `authenticated` + revogar GRANT `anon` | 🔴 Crítico | Baixo | Médio (validar webhook SPED) | Não |
| P1 | Revogar GRANT `anon` ALL em `users/companies/payslips/audit_logs/processing_logs/rubric_patterns` (manter só o necessário) | 🟠 Alto | Médio | Médio (mapear RPCs anon) | Não |
| P1 | `search_path` fixo nas 17 `SECURITY DEFINER` | 🟠 Alto | Baixo | Baixo | Não |
| P2 | `audit_logs` INSERT check tautológico → `auth.uid() IS NOT NULL` | 🟡 Médio | Baixo | Baixo | Não |
| P2 | `search_path` fixo nas 10 funções restantes | 🟡 Médio | Baixo | Baixo | Não |
| P2 | Habilitar leaked-password protection + política de senha (painel) | 🟡 Médio | Baixo | Baixo | Não |
| P2 | Centralizar catálogo LLM (DRY) + atualizar modelos | 🟡 Médio | Médio | Médio (migration+deploy) | Não |
| P3 | Remover rotas/páginas `/test` | 🟢 Baixo | Baixo | Baixo | Não |
| P3 | Estrutura inicial de testes (Vitest + RBAC) | 🟡 Médio | Médio | Baixo | Não |
| P3 | Consolidar/arquivar migrations `log_auth_event` | 🟢 Baixo | Médio | Médio (não apagar aplicadas) | Não |
| P4 | Módulo de Configurações do Sistema (feature nova) | — | Alto | Médio | Não |
| — | Buckets públicos | — | — | — | **Não alterar** |

**Sequência recomendada:** P0 → P1 → P2, cada um como migration isolada e reversível, validando a aplicação entre etapas. P4 só após P0–P2.

---

# ENTREGÁVEL 3 — Checklist Final

| Item do escopo | Status |
|----------------|--------|
| 1. search_path mutável (27 funções localizadas/analisadas) | ✅ Revisado · ⚠️ Requer decisão p/ aplicar |
| 2. SECURITY DEFINER (66 revisadas; sem exposição de secrets) | ✅ Revisado · ⚠️ Requer decisão (grants anon) |
| 3. RLS ALWAYS TRUE (SPED + users + audit) | ✅ Revisado · ⚠️ Requer decisão p/ corrigir |
| 4. Buckets públicos | ❌ Não aplicável (não alterar) — apenas documentado |
| 5. Senhas comprometidas (HIBP/política) | ⚠️ Requer decisão (toggle no painel) |
| 6. Limpeza de migrations | ✅ Revisado · ⚠️ Requer decisão (squash/arquivar) |
| 7. Código morto (rotas /test, Judit) | ✅ Revisado — pronto p/ remover |
| 8. Testes (ausência confirmada) | ✅ Revisado — arquitetura proposta |
| 9. Biblioteca de modelos LLM | ✅ Revisado — centralização proposta |
| 10. Módulo de Configurações do Sistema | ✅ Revisado — arquitetura proposta (feature nova) |

**Legenda:** ✅ Revisado/Corrigido · ⚠️ Requer decisão · ❌ Não aplicável

---

## Status de Implementação (aplicado em 27/06/2026)

Após validação de dependências (confirmado que os fluxos chamam as RPCs como **authenticated**, exceto `log_auth_event`/fallback de `audit_logs` que são **pré-auth** e foram preservados):

### ✅ Aplicado no banco (migrations versionadas, reversíveis)
- **P0** `security_p0_rls_users_and_sped_restrict`:
  - `users_update_all` / `users_delete_all` → restritos a "próprio registro **ou** administrador ativo".
  - SPED (`sped_files`, `sped_processing`, `sped_files_processing`) → de `TO public USING(true)` para `TO authenticated`.
  - *Verificado ao vivo.*
- **P1** `security_p1_search_path_and_least_privilege`:
  - `search_path = public, pg_temp` fixado nas **27** funções mutáveis (0 restantes — verificado).
  - `EXECUTE` de `anon` revogado nas 7 funções de processamento/stats + 3 sem chamador (mantido em `log_auth_event` e `complete_first_access`).
  - `anon` removido por completo de `sped_*`/`processing_logs`; privilégios destrutivos (TRUNCATE/UPDATE/DELETE/REFERENCES/TRIGGER) removidos de `users/companies/payslips/rubric_patterns/audit_logs` (mantido `SELECT,INSERT` — gated por RLS / fallback de auditoria).
- **#9** `expand_chats_llm_model_check_new_models`: CHECK de `chats.llm_model` ampliado (aditivo) para os novos ids.

### ✅ Aplicado no código
- **#9 Biblioteca LLM centralizada** em [src/config/llmModels.ts](src/config/llmModels.ts) (fonte única). `chatService.ts` e `ModelSelector.tsx` agora derivam dela (DRY). Edge Function `chat-completion` corrigida (mismatches gemini/claude) e **redeployada (v6)** com mapa espelhado. Modelos atuais adicionados (OpenAI gpt-4o/mini, Gemini 2.5 Pro, Claude Opus 4.8 / Sonnet 4.6 / Haiku 4.5).
- **#7 Código morto**: removidas rotas `/test`, `/test/payroll-workflow`, páginas `TestPage`/`TestPayrollWorkflow` e `src/test-log-function.ts`.
- **#8 Testes**: estrutura inicial com **Vitest** (`npm test`/`test:watch`, `vitest.config.ts`) + smoke tests do catálogo LLM (5 passando). `npm run build` verde.

### ⚠️ Não aplicado (requer decisão / fora do alcance escolhido)
- **#5** Proteção de senha vazada (HIBP) — toggle no painel Supabase Auth.
- **#6** Squash/arquivamento das migrations `log_auth_event` — requer validação de `schema_migrations`.
- **#10** Módulo de Configurações do Sistema — feature nova de grande porte (P4), a ser entregue após P0–P2.
- **`audit_logs` INSERT permissivo** — mantido deliberadamente (o fallback pré-auth `logAuthEventFallback` insere com `user_id` arbitrário; tightening quebraria a auditoria de login/reset).

---

## Restrições respeitadas
- Nenhuma alteração aplicada nesta entrega (somente diagnóstico).
- Buckets públicos intocados.
- Nenhuma regra de negócio alterada.
- Todas as correções propostas seguem menor privilégio, são pequenas, isoladas e reversíveis.
</content>
</invoke>
