# Correção: Criação e Edição de Usuários (Admin)

**Data:** 19/03/2026

## Problema Identificado

O `supabaseAdmin` foi intencionalmente desabilitado no frontend por questões de segurança (arquivo `src/lib/supabase.ts`). O cliente admin é um Proxy que lança erro ao ser acessado:

> "supabaseAdmin não está disponível no frontend. Use uma Edge Function autenticada para operações administrativas."

Isso causava falhas em:

1. **UserCreateModal** – Erro ao cadastrar novo usuário (verificação de email, criação em auth.users, inserção em public.users)
2. **UserEditModal** – Erro ao alterar/salvar senha de usuário (auth.admin.updateUserById)

## Solução Implementada

Foram criadas duas Edge Functions autenticadas que executam as operações administrativas no backend:

### 1. `admin-create-user`

- **Localização:** `supabase/functions/admin-create-user/`
- **Função:** Criar novo usuário (auth + perfil)
- **Autorização:** Apenas usuários com role `administrator`, `it` ou `advogado_adm`
- **Payload:**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "role": "string",
    "status": "ativo" | "inativo" (opcional)
  }
  ```

### 2. `admin-update-user-password`

- **Localização:** `supabase/functions/admin-update-user-password/`
- **Função:** Atualizar senha de usuário existente
- **Autorização:** Apenas usuários com role `administrator`, `it` ou `advogado_adm`
- **Payload:**
  ```json
  {
    "userId": "uuid",
    "newPassword": "string"
  }
  ```

## Alterações no Código

### UserService (`src/services/userService.ts`)

- **createUser:** Passou a chamar `supabase.functions.invoke('admin-create-user', { body })` em vez de `supabaseAdmin`
- **updateUser:** Quando há nova senha, chama `supabase.functions.invoke('admin-update-user-password', { body })` em vez de `supabaseAdmin.auth.admin.updateUserById`
- Removido import de `supabaseAdmin`

### Fluxo de Autenticação

As Edge Functions recebem o header `Authorization` automaticamente via `supabase.functions.invoke()`, validam a sessão e verificam se o usuário possui role administrativa antes de executar as operações.

## Deploy das Edge Functions

Para que as alterações funcionem em produção/homologação, é necessário fazer o deploy das novas Edge Functions:

```bash
# Deploy de todas as funções admin
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user-password
```

Ou deploy de todas as funções do projeto:

```bash
supabase functions deploy
```

## Variáveis de Ambiente

As Edge Functions utilizam as variáveis padrão do Supabase (definidas automaticamente no deploy):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Observação: Exclusão de Usuário

O método `UserService.deleteUser` ainda utiliza `supabase.auth.admin.deleteUser`, que não está disponível no cliente anon. Se a exclusão de usuários for utilizada, será necessário criar uma Edge Function `admin-delete-user` seguindo o mesmo padrão.
