-- Criar usuário de teste
-- Email: teste@exemplo.com
-- Senha: 123456

-- Primeiro, remover qualquer usuário de teste existente
DELETE FROM public.users WHERE email = 'teste@exemplo.com';

-- Remover do auth.users também (se existir)
DELETE FROM auth.users WHERE email = 'teste@exemplo.com';

-- Criar usuário no auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste@exemplo.com',
  crypt('123456', gen_salt('bf')),
  NOW(),
  NULL,
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Criar perfil na tabela public.users
INSERT INTO public.users (
  auth_user_id,
  email,
  name,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'teste@exemplo.com'),
  'teste@exemplo.com',
  'Usuário Teste',
  'administrator',
  'active',
  NOW(),
  NOW()
);