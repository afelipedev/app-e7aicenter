-- =====================================================
-- MIGRAÇÃO CRÍTICA: Correção DEFINITIVA do erro PGRST202 
-- Função: log_auth_event
-- Data: 2025-01-02 15:20:30
-- Versão: CRITICAL FIX
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

    RETURN v_log_id;

EXCEPTION
    WHEN OTHERS THEN
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

-- 7. TESTE BÁSICO DA FUNÇÃO
DO $$
DECLARE
    v_test_result UUID;
BEGIN
    -- Teste básico
    SELECT public.log_auth_event(
        NULL,
        'migration_test_critical',
        '{"test": true, "migration": "20251102_152030_critical_fix"}'::jsonb,
        NULL,
        NULL
    ) INTO v_test_result;
    
    IF v_test_result IS NOT NULL THEN
        RAISE NOTICE 'SUCESSO: Função log_auth_event testada com sucesso. ID: %', v_test_result;
    ELSE
        RAISE EXCEPTION 'ERRO: Função log_auth_event retornou NULL';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: Falha no teste da função log_auth_event: %', SQLERRM;
END;
$$;

-- 8. LIMPEZA FINAL E ATUALIZAÇÃO DO CACHE
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 9. COMENTÁRIO FINAL
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 
'FUNÇÃO CRÍTICA para registrar eventos de auditoria de autenticação.
Migração: 20251102_152030_critical_fix
Resolve DEFINITIVAMENTE o erro PGRST202 com validação robusta e cache atualizado.
Suporte aos novos tipos: FIRST_ACCESS_ATTEMPTED, FIRST_ACCESS_FAILED, FIRST_ACCESS_REQUIRED';

-- 10. LOG FINAL
DO $$
BEGIN
    RAISE NOTICE '=== MIGRAÇÃO CRÍTICA CONCLUÍDA ===';
    RAISE NOTICE 'Função log_auth_event recriada e testada';
    RAISE NOTICE 'Cache PostgREST atualizado';
    RAISE NOTICE 'Sistema pronto para uso';
    RAISE NOTICE '==================================';
END;
$$;