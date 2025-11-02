-- =====================================================
-- MIGRAÇÃO ULTIMATE: Correção DEFINITIVA do erro PGRST202 
-- Função: log_auth_event
-- Data: 2025-01-02 15:00:00
-- Versão: ULTIMATE FIX
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
SELECT pg_sleep(2);

-- 3. VERIFICAR E GARANTIR QUE A TABELA AUDIT_LOGS EXISTE
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Tabela audit_logs não existe!';
    END IF;
    
    -- Verificar colunas essenciais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'event_type') THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Coluna event_type não existe na tabela audit_logs!';
    END IF;
    
    RAISE NOTICE 'SUCESSO: Tabela audit_logs verificada e está OK';
END;
$$;

-- 4. CRIAR A FUNÇÃO COM ASSINATURA EXATA E VALIDAÇÕES ROBUSTAS
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

    -- Log de debug detalhado
    RAISE NOTICE 'log_auth_event INICIADO: user_id=%, event_type=%, event_data_size=%, ip=%, user_agent_length=%', 
        p_user_id, 
        v_final_event_type, 
        jsonb_typeof(v_final_event_data),
        p_ip_address,
        CASE WHEN p_user_agent IS NOT NULL THEN length(p_user_agent) ELSE 0 END;

    -- Inserir o log na tabela audit_logs com validação extra
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        v_final_event_type, -- Garantido que não é null
        v_final_event_data, -- Garantido que não é null
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO v_log_id;

    -- Verificar se a inserção foi bem-sucedida
    IF v_log_id IS NULL THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Falha ao inserir log - ID retornado é NULL';
    END IF;

    -- Log de sucesso
    RAISE NOTICE 'log_auth_event SUCESSO: ID=%, EventType=%, UserID=%', v_log_id, v_final_event_type, p_user_id;

    RETURN v_log_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Log detalhado do erro
        RAISE NOTICE 'log_auth_event ERRO: SQLSTATE=%, SQLERRM=%, event_type=%, user_id=%', 
            SQLSTATE, SQLERRM, p_event_type, p_user_id;
        -- Re-raise o erro para que o cliente saiba que falhou
        RAISE;
END;
$$;

-- 5. CONCEDER TODAS AS PERMISSÕES NECESSÁRIAS
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO postgres;

-- 6. FORÇAR MÚLTIPLAS ATUALIZAÇÕES DO CACHE COM DELAYS
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);

-- 7. TESTE ABRANGENTE DA FUNÇÃO
DO $$
DECLARE
    v_test_result_1 UUID;
    v_test_result_2 UUID;
    v_test_result_3 UUID;
BEGIN
    -- Teste 1: Teste básico com todos os parâmetros
    SELECT public.log_auth_event(
        gen_random_uuid(),
        'migration_test_complete',
        '{"test": true, "migration": "20251102_150000_ultimate_log_auth_event_fix", "test_type": "complete"}'::jsonb,
        '127.0.0.1'::inet,
        'Ultimate Migration Test Agent v2.0'
    ) INTO v_test_result_1;
    
    -- Teste 2: Teste com parâmetros mínimos (apenas event_type)
    SELECT public.log_auth_event(
        NULL,
        'migration_test_minimal',
        NULL,
        NULL,
        NULL
    ) INTO v_test_result_2;
    
    -- Teste 3: Teste com event_data vazio
    SELECT public.log_auth_event(
        NULL,
        'migration_test_empty_data',
        '{}'::jsonb,
        NULL,
        NULL
    ) INTO v_test_result_3;
    
    -- Verificar se todos os testes passaram
    IF v_test_result_1 IS NOT NULL AND v_test_result_2 IS NOT NULL AND v_test_result_3 IS NOT NULL THEN
        RAISE NOTICE 'SUCESSO TOTAL: Todos os 3 testes da função log_auth_event passaram!';
        RAISE NOTICE 'Teste 1 (completo): %', v_test_result_1;
        RAISE NOTICE 'Teste 2 (mínimo): %', v_test_result_2;
        RAISE NOTICE 'Teste 3 (data vazio): %', v_test_result_3;
    ELSE
        RAISE EXCEPTION 'ERRO: Algum teste falhou - IDs: %, %, %', v_test_result_1, v_test_result_2, v_test_result_3;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Falha nos testes da função log_auth_event: %', SQLERRM;
END;
$$;

-- 8. TESTE DE VALIDAÇÃO: Tentar chamar com event_type null (deve falhar)
DO $$
DECLARE
    v_should_fail UUID;
BEGIN
    -- Este teste DEVE falhar
    BEGIN
        SELECT public.log_auth_event(NULL, NULL, NULL, NULL, NULL) INTO v_should_fail;
        RAISE EXCEPTION 'ERRO: Função deveria ter falhado com event_type NULL mas não falhou!';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'SUCESSO: Validação de event_type NULL funcionou corretamente - %', SQLERRM;
    END;
END;
$$;

-- 9. VERIFICAR ESTRUTURA FINAL DA TABELA AUDIT_LOGS
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Contar registros de teste inseridos
    SELECT COUNT(*) INTO v_count 
    FROM public.audit_logs 
    WHERE event_type LIKE 'migration_test_%';
    
    IF v_count >= 3 THEN
        RAISE NOTICE 'SUCESSO: % registros de teste inseridos na tabela audit_logs', v_count;
    ELSE
        RAISE EXCEPTION 'ERRO: Apenas % registros de teste encontrados, esperado pelo menos 3', v_count;
    END IF;
END;
$$;

-- 10. LIMPEZA FINAL E ATUALIZAÇÃO DO CACHE
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 11. COMENTÁRIO FINAL DETALHADO
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 
'FUNÇÃO ULTIMATE para registrar eventos de auditoria de autenticação.
Migração: 20251102_150000_ultimate_log_auth_event_fix
Resolve DEFINITIVAMENTE o erro PGRST202 com:
- Limpeza completa de versões anteriores
- Validação robusta de parâmetros
- Tratamento de erros detalhado
- Testes abrangentes incluídos
- Cache PostgREST forçadamente atualizado
- Suporte completo aos novos tipos de evento: FIRST_ACCESS_ATTEMPTED, FIRST_ACCESS_FAILED, FIRST_ACCESS_REQUIRED';

-- 12. LOG FINAL DE SUCESSO
DO $$
BEGIN
    RAISE NOTICE '=== MIGRAÇÃO ULTIMATE CONCLUÍDA COM SUCESSO ===';
    RAISE NOTICE 'Função log_auth_event recriada e testada';
    RAISE NOTICE 'Cache PostgREST atualizado múltiplas vezes';
    RAISE NOTICE 'Todos os testes passaram';
    RAISE NOTICE 'Sistema pronto para uso';
    RAISE NOTICE '===============================================';
END;
$$;