-- =====================================================
-- ATUALIZAÇÃO: Marcar primeiro acesso como completado automaticamente
-- =====================================================
-- Esta migração atualiza as funções de criação de usuários para que
-- novos usuários já tenham o primeiro acesso marcado como completado
-- automaticamente, eliminando a necessidade de alteração de senha.

-- 1. ATUALIZAR FUNÇÃO handle_new_user
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email text;
    user_name text;
    user_role text;
BEGIN
    -- Verificar se o usuário já existe (evitar duplicação)
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RAISE LOG 'Usuário já existe: %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Extrair email (obrigatório)
    user_email := NEW.email;
    IF user_email IS NULL OR user_email = '' THEN
        RAISE LOG 'Email não fornecido para usuário: %', NEW.id;
        RETURN NEW;
    END IF;
    
    -- Extrair nome dos metadados (com múltiplos fallbacks)
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
    
    -- Inserir usuário na tabela public.users com primeiro acesso já completado
    BEGIN
        INSERT INTO public.users (
            id,
            email,
            name,
            role,
            active,
            created_at,
            updated_at,
            first_access_completed,
            first_access_at
        ) VALUES (
            NEW.id,
            user_email,
            user_name,
            user_role,
            true,
            NOW(),
            NOW(),
            true,  -- Primeiro acesso já completado automaticamente
            NOW()  -- Data de conclusão do primeiro acesso
        );
        
        RAISE LOG 'Usuário criado com sucesso (primeiro acesso auto-completado): ID=%, Email=%, Nome=%, Role=%', 
                  NEW.id, user_email, user_name, user_role;
                  
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'ERRO ao criar usuário: %, SQLSTATE: %, SQLERRM: %', 
                  NEW.id, SQLSTATE, SQLERRM;
        -- Não falhar o trigger, apenas logar o erro
    END;
    
    RETURN NEW;
END;
$$;

-- 2. ATUALIZAR FUNÇÃO create_user_manually
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
    
    -- Inserir usuário com primeiro acesso já completado
    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        active,
        created_at,
        updated_at,
        first_access_completed,
        first_access_at
    ) VALUES (
        user_id,
        user_email,
        final_name,
        final_role,
        true,
        NOW(),
        NOW(),
        true,  -- Primeiro acesso já completado automaticamente
        NOW()  -- Data de conclusão do primeiro acesso
    );
    
    RAISE NOTICE 'Usuário criado manualmente (primeiro acesso auto-completado): ID=%, Email=%, Nome=%, Role=%', 
                 user_id, user_email, final_name, final_role;
    
    RETURN true;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar usuário manualmente: %', SQLERRM;
END;
$$;

-- 3. ATUALIZAR USUÁRIOS EXISTENTES QUE AINDA NÃO COMPLETARAM O PRIMEIRO ACESSO
-- =====================================================

-- Marcar usuários existentes que ainda não completaram o primeiro acesso como completados
UPDATE public.users 
SET 
    first_access_completed = true,
    first_access_at = COALESCE(first_access_at, created_at, NOW()),
    updated_at = NOW()
WHERE 
    first_access_completed = false 
    OR first_access_completed IS NULL;

-- 4. VERIFICAÇÕES E LOGS
-- =====================================================

-- Verificar quantos usuários foram atualizados
DO $$
DECLARE
    updated_count integer;
    total_users integer;
BEGIN
    SELECT COUNT(*) INTO total_users FROM public.users;
    SELECT COUNT(*) INTO updated_count FROM public.users WHERE first_access_completed = true;
    
    RAISE NOTICE 'Migração concluída:';
    RAISE NOTICE '- Total de usuários: %', total_users;
    RAISE NOTICE '- Usuários com primeiro acesso completado: %', updated_count;
    RAISE NOTICE '- Funções atualizadas: handle_new_user, create_user_manually';
    RAISE NOTICE '- Novos usuários terão primeiro acesso automaticamente completado';
END $$;