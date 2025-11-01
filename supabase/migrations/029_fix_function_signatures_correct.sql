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

-- 4. Comentários para documentação
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 'Registra eventos de auditoria no sistema';
COMMENT ON FUNCTION public.complete_first_access(UUID) IS 'Marca o primeiro acesso como completado para um usuário';