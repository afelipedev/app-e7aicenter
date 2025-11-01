-- Migração para corrigir assinaturas das funções para corresponder ao código
-- Resolve os erros PGRST202 ajustando as assinaturas das funções

-- 1. Remover funções existentes com assinaturas incorretas
DROP FUNCTION IF EXISTS public.complete_first_access(uuid, inet, text);
DROP FUNCTION IF EXISTS public.log_auth_event(uuid, text, jsonb, inet, text);

-- 2. Recriar função log_auth_event com assinatura correta (conforme userSyncService)
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Inserir log na tabela audit_logs
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_data,
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recriar função complete_first_access com assinatura simplificada (conforme firstAccessService)
CREATE OR REPLACE FUNCTION public.complete_first_access(
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
    user_email TEXT;
BEGIN
    -- Verificar se usuário existe e obter email
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id), 
           (SELECT email FROM public.users WHERE id = user_id LIMIT 1)
    INTO user_exists, user_email;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status de primeiro acesso
    UPDATE public.users 
    SET 
        first_access_completed = TRUE,
        first_access_at = NOW()
    WHERE id = user_id;
    
    -- Registrar evento de auditoria (sem IP e user agent por enquanto)
    PERFORM public.log_auth_event(
        user_id,
        'first_access_completed',
        jsonb_build_object(
            'completed_at', NOW(),
            'success', TRUE,
            'user_email', user_email
        ),
        NULL,
        NULL
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para verificar status de primeiro acesso (manter existente)
CREATE OR REPLACE FUNCTION public.check_first_access_status(
    user_email TEXT
)
RETURNS TABLE (
    needs_first_access BOOLEAN,
    user_id UUID,
    last_login_at TIMESTAMP WITH TIME ZONE,
    first_access_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Buscar usuário por email
    SELECT 
        u.id,
        u.email,
        u.first_access_completed,
        u.first_access_at,
        u.last_access,
        u.status
    INTO user_record
    FROM public.users u
    WHERE u.email = user_email
    AND u.status = 'ativo';
    
    -- Se usuário não encontrado, retornar que não precisa de primeiro acesso
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::UUID,
            NULL::TIMESTAMP WITH TIME ZONE,
            NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Retornar status baseado no campo first_access_completed
    RETURN QUERY SELECT 
        NOT COALESCE(user_record.first_access_completed, FALSE),
        user_record.id,
        user_record.last_access,
        user_record.first_access_at;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para buscar usuários que precisam de primeiro acesso
CREATE OR REPLACE FUNCTION public.get_users_requiring_first_access()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at
    FROM public.users u
    WHERE 
        COALESCE(u.first_access_completed, FALSE) = FALSE
        AND u.status = 'ativo'
    ORDER BY u.created_at DESC;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função de diagnóstico
CREATE OR REPLACE FUNCTION public.diagnose_user_auth_issues(
    user_email TEXT
)
RETURNS TABLE (
    can_repair BOOLEAN,
    issue_type TEXT,
    description TEXT
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Buscar usuário por email
    SELECT 
        u.id,
        u.email,
        u.auth_user_id,
        u.status,
        u.first_access_completed
    INTO user_record
    FROM public.users u
    WHERE u.email = user_email;
    
    -- Se usuário não encontrado
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'user_not_found'::TEXT,
            'Usuário não encontrado na tabela public.users'::TEXT;
        RETURN;
    END IF;
    
    -- Se usuário inativo
    IF user_record.status != 'ativo' THEN
        RETURN QUERY SELECT 
            FALSE,
            'user_inactive'::TEXT,
            'Usuário está inativo'::TEXT;
        RETURN;
    END IF;
    
    -- Se auth_user_id está nulo
    IF user_record.auth_user_id IS NULL THEN
        RETURN QUERY SELECT 
            TRUE,
            'missing_auth_user_id'::TEXT,
            'auth_user_id está nulo - requer sincronização'::TEXT;
        RETURN;
    END IF;
    
    -- Se chegou até aqui, usuário está OK
    RETURN QUERY SELECT 
        TRUE,
        'no_issues'::TEXT,
        'Usuário não possui problemas detectados'::TEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentários para documentação
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 'Registra eventos de auditoria no sistema';
COMMENT ON FUNCTION public.check_first_access_status(TEXT) IS 'Verifica se um usuário precisa completar o primeiro acesso';
COMMENT ON FUNCTION public.complete_first_access(UUID) IS 'Marca o primeiro acesso como completado para um usuário';
COMMENT ON FUNCTION public.get_users_requiring_first_access() IS 'Lista usuários que precisam completar o primeiro acesso';
COMMENT ON FUNCTION public.diagnose_user_auth_issues(TEXT) IS 'Diagnostica problemas de autenticação para um usuário específico';