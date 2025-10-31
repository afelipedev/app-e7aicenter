-- Migration: 007_create_test_user
-- Description: Criar usuário de teste para debug do login
-- Created: 2025-01-25

-- =====================================================
-- CRIAR USUÁRIO DE TESTE
-- =====================================================

-- Primeiro, criar o usuário no auth.users (simulando o que o Supabase faria)
DO $$
DECLARE
    test_auth_id uuid;
    test_email text := 'teste@e7vieira.com.br';
    test_password text := '123456';
BEGIN
    -- Gerar um UUID para o usuário de teste
    test_auth_id := gen_random_uuid();
    
    -- Inserir diretamente na tabela auth.users (apenas para teste)
    -- NOTA: Em produção, isso seria feito via Supabase Auth API
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        test_auth_id,
        test_email,
        crypt(test_password, gen_salt('bf')), -- Hash da senha
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Usuário Teste", "role": "administrator"}',
        false,
        'authenticated'
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Inserir na tabela public.users
    INSERT INTO public.users (
        auth_user_id,
        email,
        name,
        role,
        active,
        created_at,
        updated_at
    ) VALUES (
        test_auth_id,
        test_email,
        'Usuário Teste',
        'administrator',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE 'Usuário de teste criado: %', test_email;
    RAISE NOTICE 'Senha: %', test_password;
    RAISE NOTICE 'Auth ID: %', test_auth_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar usuário de teste: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICAR CRIAÇÃO
-- =====================================================

-- Verificar se o usuário foi criado corretamente
DO $$
DECLARE
    auth_count integer;
    public_count integer;
    test_user_exists boolean;
BEGIN
    -- Contar usuários
    SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = 'teste@e7vieira.com.br';
    SELECT COUNT(*) INTO public_count FROM public.users WHERE email = 'teste@e7vieira.com.br';
    
    test_user_exists := (auth_count > 0 AND public_count > 0);
    
    RAISE NOTICE 'Verificação do usuário de teste:';
    RAISE NOTICE 'Existe em auth.users: %', (auth_count > 0);
    RAISE NOTICE 'Existe em public.users: %', (public_count > 0);
    RAISE NOTICE 'Usuário de teste válido: %', test_user_exists;
    
    IF test_user_exists THEN
        RAISE NOTICE 'SUCESSO: Usuário de teste criado e sincronizado!';
        RAISE NOTICE 'Email: teste@e7vieira.com.br';
        RAISE NOTICE 'Senha: 123456';
    ELSE
        RAISE WARNING 'FALHA: Usuário de teste não foi criado corretamente';
    END IF;
END $$;