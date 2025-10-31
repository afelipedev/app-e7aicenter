-- Debug da tabela users para identificar problemas de autenticação
-- Verificar dados atuais na tabela users

DO $$
DECLARE
    user_record RECORD;
    auth_record RECORD;
BEGIN
    RAISE NOTICE '=== DEBUG DA TABELA USERS ===';
    
    -- Mostrar todos os usuários na tabela public.users
    RAISE NOTICE 'Usuários na tabela public.users:';
    FOR user_record IN 
        SELECT id, auth_user_id, name, email, role, status, created_at, last_access
        FROM public.users 
        ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'ID: %, Auth ID: %, Nome: %, Email: %, Role: %, Status: %, Criado: %, Último acesso: %', 
            user_record.id, 
            user_record.auth_user_id, 
            user_record.name, 
            user_record.email, 
            user_record.role, 
            user_record.status, 
            user_record.created_at, 
            user_record.last_access;
    END LOOP;
    
    -- Mostrar usuários na tabela auth.users
    RAISE NOTICE '';
    RAISE NOTICE 'Usuários na tabela auth.users:';
    FOR auth_record IN 
        SELECT id, email, created_at, last_sign_in_at, email_confirmed_at
        FROM auth.users 
        ORDER BY created_at DESC
    LOOP
        RAISE NOTICE 'Auth ID: %, Email: %, Criado: %, Último login: %, Email confirmado: %', 
            auth_record.id, 
            auth_record.email, 
            auth_record.created_at, 
            auth_record.last_sign_in_at, 
            auth_record.email_confirmed_at;
    END LOOP;
    
    -- Verificar se há usuários em auth.users sem correspondência em public.users
    RAISE NOTICE '';
    RAISE NOTICE 'Usuários em auth.users sem correspondência em public.users:';
    FOR auth_record IN 
        SELECT au.id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.auth_user_id
        WHERE pu.auth_user_id IS NULL
    LOOP
        RAISE NOTICE 'Auth ID órfão: %, Email: %, Criado: %', 
            auth_record.id, 
            auth_record.email, 
            auth_record.created_at;
    END LOOP;
    
    -- Verificar se há usuários em public.users sem correspondência em auth.users
    RAISE NOTICE '';
    RAISE NOTICE 'Usuários em public.users sem correspondência em auth.users:';
    FOR user_record IN 
        SELECT pu.id, pu.auth_user_id, pu.email, pu.name
        FROM public.users pu
        LEFT JOIN auth.users au ON pu.auth_user_id = au.id
        WHERE au.id IS NULL
    LOOP
        RAISE NOTICE 'Public user órfão: %, Auth ID: %, Email: %, Nome: %', 
            user_record.id, 
            user_record.auth_user_id, 
            user_record.email, 
            user_record.name;
    END LOOP;
    
END $$;

-- Verificar políticas RLS ativas
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== POLÍTICAS RLS ATIVAS ===';
    
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Política: %, Comando: %, Qualificação: %', 
            policy_record.policyname, 
            policy_record.cmd, 
            policy_record.qual;
    END LOOP;
END $$;