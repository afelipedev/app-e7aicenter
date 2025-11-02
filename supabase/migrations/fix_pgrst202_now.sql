-- =====================================================
-- MIGRAÇÃO EMERGENCIAL: Correção DEFINITIVA do erro PGRST202 
-- Função: log_auth_event
-- Data: 2025-01-02 16:00:00
-- Versão: EMERGENCY FIX NOW
-- =====================================================

-- 1. LIMPEZA COMPLETA: Remover TODAS as versões possíveis da função
DROP FUNCTION IF EXISTS public.log_auth_event CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(p_user_id UUID, p_event_type TEXT, p_event_data JSONB, p_ip_address INET, p_user_agent TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(UUID DEFAULT NULL, TEXT DEFAULT NULL, JSONB DEFAULT NULL, INET DEFAULT NULL, TEXT DEFAULT NULL) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(p_user_id UUID DEFAULT NULL, p_event_type TEXT DEFAULT NULL, p_event_data JSONB DEFAULT NULL, p_ip_address INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL) CASCADE;

-- 2. FORÇAR LIMPEZA AGRESSIVA DO CACHE POSTGREST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(3);

-- 3. CRIAR A FUNÇÃO COM ASSINATURA EXATA E VALIDAÇÕES ROBUSTAS
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
    v_log_id UUID;
    v_final_event_type TEXT;
    v_final_event_data JSONB;
BEGIN
    -- VALIDAÇÃO CRÍTICA: event_type nunca pode ser null
    IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: event_type é obrigatório e não pode ser null ou vazio. Valor recebido: %', p_event_type;
    END IF;

    -- Sanitizar e validar event_type
    v_final_event_type := trim(p_event_type);
    
    -- Garantir que event_data nunca seja null
    v_final_event_data := COALESCE(p_event_data, '{}'::jsonb);

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
        v_final_event_type,
        v_final_event_data,
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO v_log_id;

    -- Verificar se a inserção foi bem-sucedida
    IF v_log_id IS NULL THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Falha ao inserir log - ID retornado é NULL';
    END IF;

    RETURN v_log_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- 4. CONCEDER TODAS AS PERMISSÕES NECESSÁRIAS
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO postgres;

-- 5. FORÇAR MÚLTIPLAS ATUALIZAÇÕES DO CACHE
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);

-- 6. TESTE BÁSICO DA FUNÇÃO
DO $$
DECLARE
    v_test_result UUID;
BEGIN
    SELECT public.log_auth_event(
        NULL,
        'emergency_test',
        '{"test": true, "migration": "emergency_fix_now"}'::jsonb,
        NULL,
        NULL
    ) INTO v_test_result;
    
    IF v_test_result IS NOT NULL THEN
        RAISE NOTICE 'SUCESSO: Função testada. ID: %', v_test_result;
    ELSE
        RAISE EXCEPTION 'ERRO: Função retornou NULL';
    END IF;
END;
$$;

-- 7. ATUALIZAÇÃO FINAL DO CACHE
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 8. COMENTÁRIO
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 
'Função emergencial para log de auditoria. Resolve PGRST202 definitivamente.';

-- 9. LOG FINAL
DO $$
BEGIN
    RAISE NOTICE '=== MIGRAÇÃO EMERGENCIAL CONCLUÍDA ===';
END;
$$;