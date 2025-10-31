-- =====================================================
-- CORREÇÃO: Criação automática de usuários em public.users
-- =====================================================
-- Este arquivo corrige o problema onde novos usuários em auth.users
-- não são automaticamente criados na tabela public.users

-- 1. REMOVER TRIGGER E FUNÇÃO EXISTENTES (se existirem)
-- =====================================================

-- Remove o trigger existente (se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove a função existente (se existir)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. CRIAR NOVA FUNÇÃO ROBUSTA COM TRATAMENTO DE ERROS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_name text;
    user_role text;
    user_email text;
BEGIN
    -- Log para debug
    RAISE LOG 'Iniciando criação de usuário para ID: %', NEW.id;
    
    -- Validar se o usuário já existe na tabela public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RAISE LOG 'Usuário já existe na tabela public.users: %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Extrair email (obrigatório)
    user_email := COALESCE(NEW.email, '');
    
    -- Extrair nome dos metadados (com fallback)
    BEGIN
        user_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'display_name',
            split_part(user_email, '@', 1), -- usar parte do email como fallback
            'Usuário'
        );
    EXCEPTION WHEN OTHERS THEN
        user_name := COALESCE(split_part(user_email, '@', 1), 'Usuário');
        RAISE LOG 'Erro ao extrair nome dos metadados, usando fallback: %', user_name;
    END;
    
    -- Extrair role dos metadados (com fallback para 'advogado')
    BEGIN
        user_role := COALESCE(
            NEW.raw_user_meta_data->>'role',
            'advogado' -- role padrão
        );
        
        -- Validar se a role é válida
        IF user_role NOT IN ('administrador', 'ti', 'advogado_adm', 'advogado', 'contabil', 'financeiro') THEN
            user_role := 'advogado';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        user_role := 'advogado';
        RAISE LOG 'Erro ao extrair role dos metadados, usando padrão: %', user_role;
    END;
    
    -- Inserir usuário na tabela public.users
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            active,
            created_at,
            updated_at
        ) VALUES (
            NEW.id,
            user_email,
            user_name,
            user_role,
            true,
            NOW(),
            NOW()
        );
        
        RAISE LOG 'Usuário criado com sucesso: ID=%, Email=%, Nome=%, Role=%', 
                  NEW.id, user_email, user_name, user_role;
                  
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'ERRO ao criar usuário: %, SQLSTATE: %, SQLERRM: %', 
                  NEW.id, SQLSTATE, SQLERRM;
        -- Não falhar o trigger, apenas logar o erro
    END;
    
    RETURN NEW;
END;
$$;

-- 3. CRIAR NOVO TRIGGER
-- =====================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. FUNÇÃO PARA CRIAR USUÁRIOS MANUALMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_user_manually(
    user_id uuid,
    user_email text,
    user_name text DEFAULT NULL,
    user_role text DEFAULT 'advogado'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    final_name text;
    final_role text;
BEGIN
    -- Validar parâmetros obrigatórios
    IF user_id IS NULL OR user_email IS NULL OR user_email = '' THEN
        RAISE EXCEPTION 'ID do usuário e email são obrigatórios';
    END IF;
    
    -- Verificar se o usuário já existe
    IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
        RAISE NOTICE 'Usuário já existe: %', user_id;
        RETURN false;
    END IF;
    
    -- Preparar nome
    final_name := COALESCE(user_name, split_part(user_email, '@', 1), 'Usuário');
    
    -- Validar e preparar role
    final_role := COALESCE(user_role, 'advogado');
    IF final_role NOT IN ('administrador', 'ti', 'advogado_adm', 'advogado', 'contabil', 'financeiro') THEN
        final_role := 'advogado';
    END IF;
    
    -- Inserir usuário
    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        active,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        final_name,
        final_role,
        true,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Usuário criado manualmente: ID=%, Email=%, Nome=%, Role=%', 
                 user_id, user_email, final_name, final_role;
    
    RETURN true;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar usuário manualmente: %', SQLERRM;
END;
$$;

-- 5. FUNÇÃO PARA SINCRONIZAR USUÁRIOS EXISTENTES
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user RECORD;
    created_count integer := 0;
BEGIN
    -- Buscar usuários em auth.users que não existem em public.users
    FOR auth_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        -- Usar a função de criação manual para cada usuário
        BEGIN
            IF public.create_user_manually(
                auth_user.id,
                auth_user.email,
                COALESCE(auth_user.raw_user_meta_data->>'name', split_part(auth_user.email, '@', 1)),
                COALESCE(auth_user.raw_user_meta_data->>'role', 'advogado')
            ) THEN
                created_count := created_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao sincronizar usuário %: %', auth_user.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Sincronização concluída. Usuários criados: %', created_count;
    RETURN created_count;
END;
$$;

-- 6. EXECUTAR SINCRONIZAÇÃO DOS USUÁRIOS EXISTENTES
-- =====================================================

-- Sincronizar usuários que já existem em auth.users mas não em public.users
SELECT public.sync_existing_auth_users();

-- 7. VERIFICAÇÕES E TESTES
-- =====================================================

-- Verificar se o trigger foi criado corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN
        RAISE NOTICE 'Trigger on_auth_user_created criado com sucesso';
    ELSE
        RAISE WARNING 'Trigger on_auth_user_created NÃO foi criado';
    END IF;
END $$;

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'handle_new_user' 
        AND routine_schema = 'public'
    ) THEN
        RAISE NOTICE 'Função handle_new_user criada com sucesso';
    ELSE
        RAISE WARNING 'Função handle_new_user NÃO foi criada';
    END IF;
END $$;

-- Mostrar contagem atual de usuários
DO $$
DECLARE
    auth_count integer;
    public_count integer;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;
    
    RAISE NOTICE 'Usuários em auth.users: %', auth_count;
    RAISE NOTICE 'Usuários em public.users: %', public_count;
    
    IF auth_count = public_count THEN
        RAISE NOTICE 'SUCESSO: Contagens estão sincronizadas!';
    ELSE
        RAISE WARNING 'ATENÇÃO: Contagens diferentes - verifique a sincronização';
    END IF;
END $$;

-- =====================================================
-- COMENTÁRIOS PARA TESTE MANUAL
-- =====================================================

/*
-- Para testar a criação automática, você pode:

-- 1. Criar um usuário de teste via SQL (simula registro via auth)
INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'teste@exemplo.com',
    '{"name": "Usuário Teste", "role": "advogado"}'::jsonb,
    NOW(),
    NOW()
);

-- 2. Verificar se foi criado em public.users
SELECT * FROM public.users WHERE email = 'teste@exemplo.com';

-- 3. Para criar um usuário manualmente:
SELECT public.create_user_manually(
    gen_random_uuid(),
    'manual@exemplo.com',
    'Usuário Manual',
    'contabil'
);

-- 4. Para sincronizar todos os usuários existentes:
SELECT public.sync_existing_auth_users();
*/