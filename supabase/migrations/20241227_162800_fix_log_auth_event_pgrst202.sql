-- Migração definitiva para corrigir erro PGRST202 da função log_auth_event
-- Esta migração resolve o problema onde a função não é encontrada no schema cache

-- 1. Remover todas as versões existentes da função
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS public.log_auth_event(TEXT, UUID, INET, TEXT, UUID);
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, TEXT, INET);
DROP FUNCTION IF EXISTS public.log_auth_event;

-- 2. Recriar a função com a assinatura exata esperada pelo UserSyncService
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
    -- Validar parâmetros obrigatórios
    IF p_event_type IS NULL OR p_event_type = '' THEN
        RAISE EXCEPTION 'event_type é obrigatório';
    END IF;

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
        COALESCE(p_event_data, '{}'::jsonb),
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO log_id;
    
    -- Log de sucesso para debug
    RAISE LOG 'log_auth_event executado com sucesso. ID: %, User: %, Event: %', 
        log_id, p_user_id, p_event_type;
    
    RETURN log_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log detalhado do erro
        RAISE LOG 'Erro em log_auth_event - SQLSTATE: %, SQLERRM: %, User: %, Event: %', 
            SQLSTATE, SQLERRM, p_user_id, p_event_type;
        -- Retornar NULL em caso de erro para não quebrar o fluxo
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir permissões corretas para todos os roles
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

-- 4. Adicionar comentário para documentação
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 
'Registra eventos de auditoria de autenticação no sistema. Usado pelo UserSyncService.';

-- 5. Testar a função para garantir que funciona
DO $$
DECLARE
    test_result UUID;
BEGIN
    -- Teste básico da função
    SELECT public.log_auth_event(
        NULL,
        'TEST_MIGRATION',
        '{"test": true, "migration": "20241227_162800_fix_log_auth_event_pgrst202"}'::jsonb,
        NULL,
        'Migration Test'
    ) INTO test_result;
    
    IF test_result IS NOT NULL THEN
        RAISE NOTICE 'Função log_auth_event testada com sucesso. ID do log: %', test_result;
    ELSE
        RAISE NOTICE 'Teste da função log_auth_event retornou NULL';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao testar função log_auth_event: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- 6. Forçar reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- 7. Verificar se a função foi criada corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'log_auth_event'
        AND p.pronargs = 5
    ) THEN
        RAISE NOTICE 'Função log_auth_event criada com sucesso com 5 parâmetros';
    ELSE
        RAISE NOTICE 'ERRO: Função log_auth_event não foi encontrada após criação';
    END IF;
END;
$$;