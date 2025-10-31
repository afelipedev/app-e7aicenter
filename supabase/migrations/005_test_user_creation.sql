-- =====================================================
-- TESTE: Verificar criação automática de usuários
-- =====================================================

-- 1. VERIFICAR ESTADO ATUAL
-- =====================================================

-- Contar usuários atuais
DO $$
DECLARE
    auth_count integer;
    public_count integer;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    
    RAISE NOTICE 'ANTES DO TESTE:';
    RAISE NOTICE 'Usuários em auth.users: %', auth_count;
    RAISE NOTICE 'Usuários em public.users: %', public_count;
END $$;

-- 2. VERIFICAR SE TRIGGER E FUNÇÃO EXISTEM
-- =====================================================

-- Verificar trigger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN
        RAISE NOTICE 'Trigger on_auth_user_created: EXISTE';
    ELSE
        RAISE WARNING 'Trigger on_auth_user_created: NÃO EXISTE';
    END IF;
END $$;

-- Verificar função
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' 
        AND routine_schema = 'public'
    ) THEN
        RAISE NOTICE 'Função handle_new_user: EXISTE';
    ELSE
        RAISE WARNING 'Função handle_new_user: NÃO EXISTE';
    END IF;
END $$;

-- 3. TESTE DE CRIAÇÃO AUTOMÁTICA
-- =====================================================

-- Criar um usuário de teste em auth.users
DO $$
DECLARE
    test_user_id uuid;
    test_email text;
    created_in_public boolean := false;
BEGIN
    -- Gerar dados de teste
    test_user_id := gen_random_uuid();
    test_email := 'teste_automatico_' || extract(epoch from now()) || '@exemplo.com';
    
    RAISE NOTICE 'INICIANDO TESTE COM:';
    RAISE NOTICE 'ID: %', test_user_id;
    RAISE NOTICE 'Email: %', test_email;
    
    -- Inserir em auth.users (isso deve disparar o trigger)
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        created_at,
        updated_at,
        email_confirmed_at,
        instance_id
    ) VALUES (
        test_user_id,
        test_email,
        '{"name": "Usuário Teste Automático", "role": "advogado"}'::jsonb,
        NOW(),
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000000'
    );
    
    RAISE NOTICE 'Usuário inserido em auth.users';
    
    -- Aguardar um momento para o trigger executar
    PERFORM pg_sleep(1);
    
    -- Verificar se foi criado em public.users
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = test_user_id
    ) INTO created_in_public;
    
    IF created_in_public THEN
        RAISE NOTICE 'SUCESSO: Usuário criado automaticamente em public.users!';
        
        -- Mostrar dados criados
        DECLARE
            user_data RECORD;
        BEGIN
            SELECT * INTO user_data FROM public.users WHERE id = test_user_id;
            RAISE NOTICE 'Dados criados: ID=%, Email=%, Nome=%, Role=%', 
                         user_data.id, user_data.email, user_data.name, user_data.role;
        END;
    ELSE
        RAISE WARNING 'FALHA: Usuário NÃO foi criado automaticamente em public.users';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ERRO durante o teste: %', SQLERRM;
END $$;

-- 4. TESTE DE CRIAÇÃO MANUAL
-- =====================================================

-- Testar função de criação manual
DO $$
DECLARE
    manual_user_id uuid;
    manual_email text;
    result boolean;
BEGIN
    manual_user_id := gen_random_uuid();
    manual_email := 'teste_manual_' || extract(epoch from now()) || '@exemplo.com';
    
    RAISE NOTICE 'TESTANDO CRIAÇÃO MANUAL:';
    RAISE NOTICE 'ID: %', manual_user_id;
    RAISE NOTICE 'Email: %', manual_email;
    
    -- Usar função de criação manual
    SELECT public.create_user_manually(
        manual_user_id,
        manual_email,
        'Usuário Teste Manual',
        'contabil'
    ) INTO result;
    
    IF result THEN
        RAISE NOTICE 'SUCESSO: Usuário criado manualmente!';
    ELSE
        RAISE WARNING 'FALHA: Erro na criação manual';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ERRO na criação manual: %', SQLERRM;
END $$;

-- 5. VERIFICAR ESTADO FINAL
-- =====================================================

DO $$
DECLARE
    auth_count integer;
    public_count integer;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    
    RAISE NOTICE 'APÓS OS TESTES:';
    RAISE NOTICE 'Usuários em auth.users: %', auth_count;
    RAISE NOTICE 'Usuários em public.users: %', public_count;
    
    IF auth_count = public_count THEN
        RAISE NOTICE 'RESULTADO: Contagens sincronizadas - SUCESSO!';
    ELSE
        RAISE WARNING 'RESULTADO: Contagens diferentes - VERIFICAR!';
    END IF;
END $$;

-- 6. LISTAR USUÁRIOS DE TESTE CRIADOS
-- =====================================================

-- Mostrar usuários de teste criados
SELECT 
    'USUÁRIOS DE TESTE CRIADOS:' as info,
    id,
    email,
    name,
    role,
    created_at
FROM public.users 
WHERE email LIKE '%teste_%@exemplo.com'
ORDER BY created_at DESC;