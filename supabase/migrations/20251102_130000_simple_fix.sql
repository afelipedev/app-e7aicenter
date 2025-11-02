-- Solução simples para o erro PGRST202 da função log_auth_event

-- Remover todas as versões anteriores da função
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(p_user_id UUID, p_event_type TEXT, p_event_data JSONB, p_ip_address INET, p_user_agent TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(TEXT, INET, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(p_event_type TEXT, p_ip_address INET, p_user_agent TEXT, p_user_id UUID) CASCADE;

-- Criar a função com a assinatura exata esperada pelo código
CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_user_id UUID DEFAULT NULL,
    p_event_type TEXT DEFAULT NULL,
    p_event_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id UUID;
BEGIN
    -- Validação básica
    IF p_event_type IS NULL OR p_event_type = '' THEN
        RAISE EXCEPTION 'event_type é obrigatório';
    END IF;
    
    -- Inserir o log na tabela audit_logs
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
        COALESCE(p_event_data, '{}'::jsonb),
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Configurar permissões
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

-- Forçar atualização do schema cache
NOTIFY pgrst, 'reload schema';