-- Migração para forçar recriação da função log_auth_event
-- Resolve problema de PGRST202 onde a função não é encontrada no schema cache

-- Primeiro, remover a função se existir
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS public.log_auth_event(TEXT, INET, TEXT, UUID);
DROP FUNCTION IF EXISTS public.log_auth_event;

-- Recriar a função com a assinatura exata esperada pelo código
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro para debug
        RAISE LOG 'Erro em log_auth_event: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões corretas
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

-- Comentário para documentação
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 'Registra eventos de auditoria de autenticação no sistema';

-- Forçar atualização do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';