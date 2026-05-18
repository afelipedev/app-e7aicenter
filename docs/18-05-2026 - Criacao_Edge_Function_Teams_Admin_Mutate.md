# Criação da Edge Function `teams-admin-mutate`

## Objetivo

Criar e publicar a edge function `teams-admin-mutate` em `supabase/functions/teams-admin-mutate/index.ts` usando o MCP do Supabase.

## Planejamento executado

1. Validar o schema das ferramentas MCP necessárias (`deploy_edge_function` e `get_edge_function`).
2. Conferir o conteúdo da função local em `supabase/functions/teams-admin-mutate/index.ts`.
3. Aplicar ajuste de compatibilidade na função.
4. Fazer deploy via MCP e validar status no projeto.

## Implementação

- Foi mantida a implementação da função já presente no arquivo local, cobrindo ações administrativas de equipes:
  - `create_team`
  - `update_team`
  - `delete_team`
  - `add_member`
  - `remove_member`
  - `update_member_role`
- Ajuste aplicado no `slugify` para robustez de regex unicode:
  - de `.replace(/[̀-ͯ]/g, "")`
  - para `.replace(/[\u0300-\u036f]/g, "")`

## Deploy e validação (MCP Supabase)

- Deploy executado com:
  - `name`: `teams-admin-mutate`
  - `entrypoint_path`: `index.ts`
  - `verify_jwt`: `true`
- Resultado:
  - `slug`: `teams-admin-mutate`
  - `version`: `1`
  - `status`: `ACTIVE`

## Observações

- A função foi criada/publicada com autenticação JWT habilitada.
- A validação final confirmou a função listada em `list_edge_functions`.
