# 27/06/2026 — Módulo de Configurações do Sistema

Novo módulo administrativo que centraliza configurações globais da aplicação. Acesso restrito a **administrator, it, advogado_adm** (gate `requiredPermission="admin"`, que mapeia exatamente para esses três papéis).

## Rota e navegação
- Rota: `/admin/settings` ([App.tsx](src/App.tsx)), protegida por `ProtectedRoute requiredPermission="admin"`.
- Menu: item "Configurações do Sistema" no grupo Administração ([AppSidebar.tsx](src/components/layout/AppSidebar.tsx)).

## Estrutura (feature-based)
```
src/features/system-settings/
  types.ts
  services/systemSettingsService.ts
  pages/SystemSettingsPage.tsx        # abas
  components/WebhooksTab.tsx          # CRUD + teste de conectividade
  components/LlmModelsTab.tsx         # parâmetros por provedor (consome catálogo central)
  components/CredentialsTab.tsx       # credenciais mascaradas, validar/rotacionar/remover
```

## Banco de dados (migrations versionadas, RLS admin-only)
- `system_webhooks` — webhooks n8n (CRUD via RLS).
- `system_llm_settings` — provedor, modelo padrão, temperatura, max_tokens, timeout, contexto, params extras.
- `system_ai_credentials` — **apenas metadados** (provider, máscara dos últimos dígitos, status, validação). O segredo **não** fica aqui.
- `system_settings_audit` — auditoria de alterações (área, ação, alvo, ator, detalhes).
- `is_system_admin()` — helper `SECURITY DEFINER` (search_path fixo) reutilizado nas policies.
- Triggers `touch_updated_at` para `updated_at`.

Migrations: `system_settings_module`, `system_settings_vault_wrappers`, `system_settings_revoke_anon_grants`.

## Segurança das credenciais de IA
- **Segredos no Supabase Vault** (criptografado em repouso). Wrappers `set_ai_secret` / `get_ai_secret` / `delete_ai_secret` são `SECURITY DEFINER`, com `search_path` fixo e **EXECUTE apenas para `service_role`** (bloqueado para anon/authenticated).
- A Edge Function **`system-settings-mutate`** (verify_jwt, valida papel admin via JWT) é a única que toca os segredos. Ações: `credential.set` (rotação), `credential.validate` (testa a chave no endpoint do provedor), `credential.delete`, `webhook.test`.
- O frontend **nunca** recebe o segredo — apenas máscara (`••••XXXX`) e status (`empty`/`configured`/`valid`/`invalid`).
- RLS admin-only em todas as tabelas; grants padrão de `anon` revogados (defesa em profundidade).
- Toda alteração registra auditoria em `system_settings_audit`.

## Integração com a biblioteca de modelos LLM
A aba "Modelos LLM" consome o catálogo único [src/config/llmModels.ts](src/config/llmModels.ts) — os modelos disponíveis por provedor vêm de lá (sem duplicação).

## Integração concluída (chat-completion)
- A Edge Function **`chat-completion` (v7)** agora resolve a chave do provedor via **Vault** (`get_ai_secret`, service_role) com **fallback para `Deno.env`** — sem quebra para quem ainda usa as chaves antigas.
- Também lê `max_tokens`/`temperature` de **`system_llm_settings`** por provedor (fallback para os padrões 2000/0.7).
- Catálogo de modelos sincronizado nos dois lados.

## Revisões/ajustes (27/06/2026)
- Menu renomeado para **"Configurações"**.
- Removido o ícone de engrenagem da top bar (que abria o perfil) e o item "Configurações" do dropdown do avatar; perfil agora só via "Perfil".
- **Teste de webhook**: passa a considerar QUALQUER resposta HTTP como "acessível" (n8n respondendo 400 ao ping ainda confirma conectividade); falha real = erro de rede/DNS/timeout.
- Página de Configurações agora **full-width/responsiva** (sem container centralizado).
- Webhooks ganharam **botão de editar** (dialog).
- Adicionados modelos **Gemini 3 Pro, Gemini 3.5 Flash, Gemini 3.1 Flash-Lite** ao catálogo, à Edge Function e ao CHECK de `chats.llm_model`.

## Verificação
- `npm run build` ✅. RLS habilitado nas 4 tabelas; 0 funções com search_path mutável; wrappers do Vault executáveis só por `service_role`; `anon` sem grants.
- Teste funcional: logar como administrator → `/admin/settings` → cadastrar/testar webhook, configurar modelo padrão, colar/validar/rotacionar chave de IA. Logar como `advogado`/`contabil` → rota bloqueada.
