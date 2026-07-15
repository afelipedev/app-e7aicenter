# 15/07/2026 - Segurança: blindagem do banco (Fase 1) e tarefas de Ops

## Incidente

Em 14/07 11:55, no quadro **"Jurídico VAA"**, foram inseridos via **API REST direta** do
Supabase (não pela aplicação):
- **1.099 cards** em <1s com `created_by_user_id = NULL`;
- **1.814 anexos duplicados** (já limpos em correção anterior).

### Causa raiz (confirmada no banco)
1. **V003 — Escalação de privilégio (crítica):** a policy `users_update_all` permitia
   qualquer usuário autenticado atualizar a própria linha **sem restrição de coluna**,
   incluindo `role`. Como os gates do kanban (`is_legal_kanban_member/admin`) são baseados
   em `role`, auto-promover-se a `administrator` dava acesso total.
2. **Falta de posse nos inserts:** `legal_kanban_cards`/`legal_kanban_attachments` usavam
   policy `ALL` com check apenas `is_legal_kanban_member()` — sem exigir
   `created_by_user_id = usuário atual` — permitindo criador nulo/forjado e inserção em lote.

## Fase 1 — implementada (banco)

Migrations (aplicadas em produção via Supabase MCP e versionadas em `supabase/migrations/`):

| Migration | O que faz |
|---|---|
| `20260715130000_users_guard_privileged_columns.sql` | Trigger `BEFORE UPDATE` em `users` que **bloqueia** alteração de `role`, `status`, `first_access_completed`, `auth_user_id` por usuário comum. Libera backend (`service_role`, RPCs `SECURITY DEFINER`) e admins reais (`is_active_administrator()`). |
| `20260715130100_kanban_enforce_ownership_and_rate_limit.sql` | Triggers `BEFORE INSERT` em cards/anexos/comentários: **forçam** `created_by`/`author` = usuário atual (bloqueia criador nulo/forjado) e **limitam a 100 inserções por transação** (anti-carga em massa) para usuários comuns. Backend preservado. |
| `20260715130200_audit_sensitive_user_changes.sql` | Trigger `AFTER UPDATE` em `users` que registra em `audit_logs` toda mudança de `role`/`status`/`first_access_completed` (autor + valor antigo/novo). |

**Detalhe crítico de implementação:** as funções dos triggers de guarda são **SECURITY
INVOKER** (padrão). Uma primeira versão saiu como `SECURITY DEFINER` e ficou inócua —
dentro de uma função `SECURITY DEFINER`, `current_user` é sempre o dono (`postgres`), então
a checagem de backend liberava tudo. Corrigido em `..._fix_guard_triggers_security_invoker`
(consolidado nos arquivos acima).

### Verificação (simulada como `authenticated` real, com rollback)
- Escalação (`UPDATE users SET role='administrator'` por não-admin): **bloqueada** ✅
- Admin alterando role de outro usuário: **permitido** ✅
- Card com `created_by=NULL`: **posse forçada ao caller** ✅
- Inserir 101 cards em um statement: **bloqueado no limite 100** ✅
- Edição de perfil (coluna não protegida): **permitida** ✅
- Fluxos de backend (`service_role`/`complete_first_access`) permanecem liberados.

### Nenhuma mudança de frontend foi necessária
`createCard` já grava `created_by_user_id: actor.id`; primeiro acesso usa a RPC
`complete_first_access` (SECURITY DEFINER); admin usa edge functions com `service_role`.

## Achado adicional (revisar)
Existem contas **`@teste.com` com role `administrator` ATIVAS em produção** (ex.:
`matheus@teste.com`, `wilton@teste.com`, `taffarel@teste.com`, `cesario@teste.com`).
Recomenda-se revisar/inativar contas de teste com privilégio de admin em produção.

## Tarefas de Ops (fora do repositório — pendentes)

Itens do `docs/relatorio_vulnerabilidades.md` que dependem de infra/painéis:

- **V002 / V012 — n8n exposto e sem auth (alta):** adicionar Header/Query Auth nos webhooks
  (`processar-holerite`, `upload-sped-efd`, `agente-juridico-dinamico`), restringir por
  IP/WAF, e idealmente expor via **edge function autenticada** como proxy. Remover URLs
  internas do frontend.
- **V005 / V008 / V010 — Vercel:** criar `vercel.json` com CORS restrito à origem conhecida,
  `404` para `/api/*` e `/.well-known/*` inexistentes, security headers; habilitar
  "remove Vercel headers".
- **V001 — anon key no bundle:** inerente ao SPA; **mitigada** pela blindagem RLS desta fase.
  Verificar que a `service_role key` nunca é embarcada no frontend. Considerar rotacionar a
  anon key e, a médio prazo, um proxy backend.
- **V011 — `auth_user_id` exposto (média):** refactor futuro — expor perfil via RPC
  `SECURITY DEFINER` (`me()`) ou view `users_public`, parando de selecionar `auth_user_id`
  amplamente.
- **V006 — Edge Functions com CORS `*` (média):** trocar por allowlist de origem por env
  (fase 2). Afeta `chat-completion`, `kanban-card-bridge`, `teams-*`, `admin-*` etc.
- **V007 — S3 (baixa):** presigned URLs com expiração curta e bloquear listagem pública.
- **V009** og:title com UUID Lovable; **V004** rotas admin (já há `ProtectedRoute`; a proteção
  real é o RLS desta fase); **V013** criar `public/.well-known/security.txt` (RFC 9116).

## Próximas fases sugeridas
- **Fase 2:** CORS allowlist nas edge functions + `vercel.json` + `security.txt` (baixo risco).
- **Fase 3:** proxy autenticado para n8n e ocultação de `auth_user_id` (V011).
