-- Funções de diagnóstico e sincronização de usuários
-- Baseado na arquitetura técnica definida

-- 1. Função para diagnosticar problemas de usuário
CREATE OR REPLACE FUNCTION public.diagnose_user_auth_issues(user_email TEXT)
RETURNS TABLE (
    issue_type TEXT,
    description TEXT,
    severity TEXT,
    suggested_action TEXT
) AS $$
DECLARE
    user_record RECORD;
    auth_user_exists BOOLEAN := FALSE;
BEGIN
    -- Verificar se usuário existe em public.users
    SELECT * INTO user_record FROM public.users WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            'missing_public_user'::TEXT,
            'Usuário não encontrado na tabela public.users'::TEXT,
            'critical'::TEXT,
            'Criar usuário na tabela public.users'::TEXT;
        RETURN;
    END IF;
    
    -- Verificar auth_user_id
    IF user_record.auth_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'missing_auth_user_id'::TEXT,
            'Campo auth_user_id está nulo'::TEXT,
            'high'::TEXT,
            'Sincronizar com auth.users ou recriar usuário'::TEXT;
    END IF;
    
    -- Verificar se há falhas recentes de reset de senha
    IF EXISTS (
        SELECT 1 FROM public.audit_logs 
        WHERE user_id = user_record.id 
        AND event_type = 'password_reset_failed'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
        RETURN QUERY SELECT 
            'recent_password_reset_failures'::TEXT,
            'Falhas recentes no reset de senha detectadas'::TEXT,
            'medium'::TEXT,
            'Verificar logs de auditoria e sincronizar dados'::TEXT;
    END IF;
    
    -- Se chegou até aqui, não há problemas críticos detectados
    IF NOT EXISTS (
        SELECT 1 FROM public.audit_logs 
        WHERE user_id = user_record.id 
        AND event_type IN ('password_reset_failed', 'auth_error')
        AND created_at > NOW() - INTERVAL '7 days'
    ) THEN
        RETURN QUERY SELECT 
            'no_issues'::TEXT,
            'Nenhum problema detectado nos últimos 7 dias'::TEXT,
            'info'::TEXT,
            'Usuário está em estado consistente'::TEXT;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para sincronizar usuário (preparação para sincronização via aplicação)
CREATE OR REPLACE FUNCTION public.sync_user_with_auth(user_email TEXT)
RETURNS TABLE (
    success BOOLEAN,
    action_taken TEXT,
    details TEXT
) AS $$
DECLARE
    user_record RECORD;
    new_auth_id UUID;
BEGIN
    -- Buscar usuário
    SELECT * INTO user_record FROM public.users WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'user_not_found'::TEXT,
            'Usuário não existe na tabela public.users'::TEXT;
        RETURN;
    END IF;
    
    -- Se auth_user_id está nulo, marcar para sincronização via aplicação
    IF user_record.auth_user_id IS NULL THEN
        -- Registrar evento de sincronização necessária
        INSERT INTO public.audit_logs (
            user_id,
            event_type,
            event_data
        ) VALUES (
            user_record.id,
            'sync_required',
            jsonb_build_object(
                'reason', 'missing_auth_user_id',
                'user_email', user_email,
                'timestamp', NOW()
            )
        );
        
        RETURN QUERY SELECT 
            FALSE,
            'requires_app_sync'::TEXT,
            'Sincronização deve ser feita via aplicação - evento registrado'::TEXT;
        RETURN;
    END IF;
    
    -- Registrar que usuário já possui auth_user_id válido
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
    ) VALUES (
        user_record.id,
        'sync_check_completed',
        jsonb_build_object(
            'result', 'no_action_needed',
            'auth_user_id', user_record.auth_user_id,
            'timestamp', NOW()
        )
    );
    
    RETURN QUERY SELECT 
        TRUE,
        'no_action_needed'::TEXT,
        'Usuário já possui auth_user_id válido'::TEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para registrar eventos de auditoria
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
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_data,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para verificar status de primeiro acesso
CREATE OR REPLACE FUNCTION public.check_first_access_status(p_user_id UUID)
RETURNS TABLE (
    is_first_access BOOLEAN,
    completed_at TIMESTAMP WITH TIME ZONE,
    requires_first_access BOOLEAN
) AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT * INTO user_record FROM public.users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::TIMESTAMP WITH TIME ZONE,
            FALSE;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 
        NOT COALESCE(user_record.first_access_completed, FALSE),
        user_record.first_access_at,
        NOT COALESCE(user_record.first_access_completed, FALSE);
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para marcar primeiro acesso como concluído
CREATE OR REPLACE FUNCTION public.complete_first_access(
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Verificar se usuário existe
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar status de primeiro acesso
    UPDATE public.users 
    SET 
        first_access_completed = TRUE,
        first_access_at = NOW()
    WHERE id = p_user_id;
    
    -- Registrar evento de auditoria
    PERFORM public.log_auth_event(
        p_user_id,
        'first_access_completed',
        jsonb_build_object(
            'completed_at', NOW(),
            'success', TRUE
        ),
        p_ip_address,
        p_user_agent
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para buscar usuários que precisam de primeiro acesso
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

-- 7. Comentários para documentação
COMMENT ON FUNCTION public.diagnose_user_auth_issues(TEXT) IS 'Diagnostica problemas de autenticação para um usuário específico';
COMMENT ON FUNCTION public.sync_user_with_auth(TEXT) IS 'Prepara sincronização de dados entre auth.users e public.users';
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 'Registra eventos de auditoria do sistema de autenticação';
COMMENT ON FUNCTION public.check_first_access_status(UUID) IS 'Verifica o status de primeiro acesso de um usuário';
COMMENT ON FUNCTION public.complete_first_access(UUID, INET, TEXT) IS 'Marca o primeiro acesso como concluído para um usuário';
COMMENT ON FUNCTION public.get_users_requiring_first_access() IS 'Retorna usuários que ainda precisam completar o primeiro acesso';