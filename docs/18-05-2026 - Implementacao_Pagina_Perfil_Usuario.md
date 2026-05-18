# Implementação da Página de Perfil do Usuário

## Data
18-05-2026

## Escopo implementado
- Criação da página `Meu perfil` para o usuário logado em `src/features/profile/pages/ProfilePage.tsx`.
- Edição de dados de perfil (`nome`, `telefone`) para todos os perfis.
- Edição de `e-mail` apenas para `administrator`, `it` e `advogado_adm`.
- Atualização da própria `senha` via Supabase Auth.
- Upload de foto de perfil com persistência em bucket Supabase Storage.

## Regras de permissão aplicadas
- **Frontend e serviço**:
  - Perfis administrativos (`administrator`, `it`, `advogado_adm`) podem editar e-mail.
  - Demais perfis editam apenas nome, telefone e foto.
- **Banco de dados**:
  - Trigger `trg_enforce_users_email_update_permissions` em `public.users` bloqueia alteração de e-mail para perfis não administrativos.
- **Backend (Edge Function)**:
  - Função `profile-update-email` exige sessão válida e papel administrativo antes de atualizar o e-mail em `auth.users` e `public.users`.

## Alterações em banco e storage (Supabase MCP)
- Aplicado via MCP (`execute_sql`) e versionado em migration:
  - `public.users.phone text null`
  - `public.users.avatar_url text null`
  - Criação/configuração do bucket `user-avatars` (público para leitura, limite 5MB, MIME `jpeg/png/webp`)
  - Políticas de Storage para upload/update/delete apenas no namespace do próprio usuário (`auth.uid()` no path)
  - Trigger e função de proteção de atualização de e-mail em `public.users`

## Arquivos criados
- `supabase/migrations/20260518053000_create_user_profile_settings.sql`
- `supabase/functions/profile-update-email/index.ts`
- `src/features/profile/types.ts`
- `src/features/profile/services/profileService.ts`
- `src/features/profile/hooks/useProfileMutations.ts`
- `src/features/profile/components/AvatarUpload.tsx`
- `src/features/profile/components/ProfileForm.tsx`
- `src/features/profile/components/SecurityForm.tsx`
- `src/features/profile/pages/ProfilePage.tsx`
- `docs/18-05-2026 - Implementacao_Pagina_Perfil_Usuario.md`

## Arquivos alterados
- `src/lib/supabase.ts` (tipagem `users` com `phone`, `avatar_url`, `first_access_*`)
- `src/contexts/AuthContext.tsx` (novo `refreshUserProfile`)
- `src/App.tsx` (rota `/perfil`)
- `src/components/layout/Header.tsx` (atalho para perfil + avatar real no header)

## Fluxo de dados final
1. Usuário acessa `/perfil`.
2. Página exibe dados de `useAuth().user`.
3. Ao salvar:
   - nome/telefone atualizam `public.users`.
   - e-mail (somente admin/ti/advogado_adm) chama `profile-update-email`.
4. Ao alterar senha, usa `supabase.auth.updateUser`.
5. Ao enviar avatar, arquivo vai para `storage/user-avatars/<auth_uid>/...` e URL pública é salva em `public.users.avatar_url`.
6. `refreshUserProfile` sincroniza os dados no contexto de autenticação para refletir no header e telas dependentes.

## Checklist de validação
- [x] Regra de e-mail por perfil aplicada em UI + serviço + banco.
- [x] Upload de avatar em bucket Supabase com políticas de escrita por usuário.
- [x] Atualização de senha do próprio usuário disponível na página de perfil.
- [x] Rota `/perfil` conectada no app e no menu do header.
- [x] Lints dos arquivos alterados sem erros.
- [x] Validação pós-DDL executada via MCP (colunas, bucket, policies e trigger).
