-- =====================================================
-- MIGRAÇÃO DEFINITIVA: Correção do erro PGRST202 
-- Função: log_auth_event
-- Data: 2025-01-02 14:00:00
-- =====================================================

-- 1. REMOVER TODAS AS VERSÕES EXISTENTES DA FUNÇÃO
-- Isso garante que não há conflitos de assinatura
DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT);
DROP FUNCTION IF EXISTS public.log_auth_event(p_user_id UUID, p_event_type TEXT, p_event_data JSONB, p_ip_address INET, p_user_agent TEXT);
DROP FUNCTION IF EXISTS public.log_auth_event(UUID DEFAULT NULL, TEXT DEFAULT NULL, JSONB DEFAULT NULL, INET DEFAULT NULL, TEXT DEFAULT NULL);
DROP FUNCTION IF EXISTS public.log_auth_event(p_user_id UUID DEFAULT NULL, p_event_type TEXT DEFAULT NULL, p_event_data JSONB DEFAULT NULL, p_ip_address INET DEFAULT NULL, p_user_agent TEXT DEFAULT NULL);

-- 2. FORÇAR LIMPEZA DO CACHE DO POSTGREST
NOTIFY pgrst, 'reload schema';

-- 3. CRIAR A FUNÇÃO COM A ASSINATURA EXATA ESPERADA PELO CÓDIGO
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
    ) RETURNING id INTO v_log_id;

    -- Log de debug (opcional - pode ser removido em produção)
    RAISE NOTICE 'Log de auditoria criado: ID=%, EventType=%, UserID=%', v_log_id, p_event_type, p_user_id;

    RETURN v_log_id;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro para debug
        RAISE NOTICE 'Erro ao criar log de auditoria: %', SQLERRM;
        -- Re-raise o erro para que o cliente saiba que falhou
        RAISE;
END;
$$;

-- 4. CONCEDER PERMISSÕES NECESSÁRIAS
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

-- 5. FORÇAR MÚLTIPLAS ATUALIZAÇÕES DO CACHE POSTGREST
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- 6. TESTAR A FUNÇÃO APÓS CRIAÇÃO
DO $$
DECLARE
    v_test_result UUID;
BEGIN
    -- Teste básico da função
    SELECT public.log_auth_event(
        NULL,
        'migration_test',
        '{"test": true, "migration": "20251102_140000_definitive_log_auth_event_fix"}'::jsonb,
        '127.0.0.1'::inet,
        'Migration Test Agent'
    ) INTO v_test_result;
    
    IF v_test_result IS NOT NULL THEN
        RAISE NOTICE 'SUCESSO: Função log_auth_event testada com sucesso. ID retornado: %', v_test_result;
    ELSE
        RAISE EXCEPTION 'ERRO: Função log_auth_event retornou NULL';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERRO: Falha no teste da função log_auth_event: %', SQLERRM;
END;
$$;

-- 7. VERIFICAR SE A TABELA AUDIT_LOGS TEM A ESTRUTURA CORRETA
DO $$
BEGIN
    -- Verificar se todas as colunas necessárias existem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'Coluna user_id não encontrada na tabela audit_logs';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs' 
        AND column_name = 'event_type'
    ) THEN
        RAISE EXCEPTION 'Coluna event_type não encontrada na tabela audit_logs';
    END IF;

    RAISE NOTICE 'SUCESSO: Estrutura da tabela audit_logs verificada';
END;
$$;

-- 8. FINAL: MAIS UMA ATUALIZAÇÃO DO CACHE
NOTIFY pgrst, 'reload schema';

-- 9. COMENTÁRIO FINAL
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 
'Função para registrar eventos de auditoria de autenticação. 
Migração definitiva: 20251102_140000_definitive_log_auth_event_fix
Resolve o erro PGRST202 garantindo assinatura correta e cache atualizado.';