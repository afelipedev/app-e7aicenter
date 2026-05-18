-- Perfil do usuário: telefone, avatar e governança de atualização de e-mail

alter table public.users
  add column if not exists phone text,
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select 'user-avatars', 'user-avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']
where not exists (
  select 1 from storage.buckets where id = 'user-avatars'
);

update storage.buckets
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'user-avatars';

drop policy if exists "Avatar público para leitura" on storage.objects;
create policy "Avatar público para leitura"
on storage.objects for select
using (bucket_id = 'user-avatars');

drop policy if exists "Avatar upload apenas do proprio usuario" on storage.objects;
create policy "Avatar upload apenas do proprio usuario"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatar update apenas do proprio usuario" on storage.objects;
create policy "Avatar update apenas do proprio usuario"
on storage.objects for update
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Avatar delete apenas do proprio usuario" on storage.objects;
create policy "Avatar delete apenas do proprio usuario"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.enforce_users_email_update_permissions()
returns trigger
language plpgsql
as $$
declare
  caller_role text;
begin
  if new.email is distinct from old.email then
    if auth.role() = 'service_role' then
      return new;
    end if;

    if auth.uid() is null then
      raise exception 'Apenas usuários autenticados podem alterar e-mail';
    end if;

    select role into caller_role
    from public.users
    where auth_user_id = auth.uid()
    limit 1;

    if caller_role is null or caller_role not in ('administrator', 'it', 'advogado_adm') then
      raise exception 'Sem permissão para alterar e-mail';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_users_email_update_permissions on public.users;
create trigger trg_enforce_users_email_update_permissions
before update of email on public.users
for each row
execute function public.enforce_users_email_update_permissions();
