-- Teste para verificar se a função log_auth_event está funcionando corretamente
-- Este teste confirma que o erro PGRST202 foi resolvido

-- Teste 1: Verificar se a função existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'log_auth_event'
        AND p.pronargs = 5
    ) THEN
        RAISE NOTICE '✅ Função log_auth_event encontrada com 5 parâmetros';
    ELSE
        RAISE NOTICE '❌ ERRO: Função log_auth_event não encontrada';
    END IF;
END;
$$;

-- Teste 2: Testar execução da função
DO $$
DECLARE
    test_result UUID;
    log_count INTEGER;
BEGIN
    -- Contar logs antes do teste
    SELECT COUNT(*) INTO log_count FROM public.audit_logs WHERE event_type = 'TEST_FUNCTION_WORKING';
    
    -- Executar a função
    SELECT public.log_auth_event(
        NULL,
        'TEST_FUNCTION_WORKING',
        '{"test": "function_test", "timestamp": "' || NOW()::text || '"}'::jsonb,
        '127.0.0.1'::inet,
        'Test User Agent'
    ) INTO test_result;
    
    IF test_result IS NOT NULL THEN
        RAISE NOTICE '✅ Função log_auth_event executada com sucesso. ID: %', test_result;
        
        -- Verificar se o log foi inserido
        SELECT COUNT(*) INTO log_count FROM public.audit_logs WHERE event_type = 'TEST_FUNCTION_WORKING';
        
        IF log_count > 0 THEN
            RAISE NOTICE '✅ Log inserido com sucesso na tabela audit_logs';
        ELSE
            RAISE NOTICE '❌ ERRO: Log não foi inserido na tabela audit_logs';
        END IF;
    ELSE
        RAISE NOTICE '❌ ERRO: Função log_auth_event retornou NULL';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERRO ao executar função log_auth_event: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Teste 3: Verificar permissões
DO $$
BEGIN
    -- Verificar se as permissões estão corretas
    IF EXISTS (
        SELECT 1 FROM information_schema.routine_privileges 
        WHERE routine_name = 'log_auth_event' 
        AND routine_schema = 'public'
        AND grantee IN ('anon', 'authenticated', 'service_role')
    ) THEN
        RAISE NOTICE '✅ Permissões configuradas corretamente para a função';
    ELSE
        RAISE NOTICE '⚠️  Verificar permissões da função log_auth_event';
    END IF;
END;
$$;

-- Limpar logs de teste
DELETE FROM public.audit_logs WHERE event_type = 'TEST_FUNCTION_WORKING';

RAISE NOTICE '🎉 Teste da função log_auth_event concluído!';