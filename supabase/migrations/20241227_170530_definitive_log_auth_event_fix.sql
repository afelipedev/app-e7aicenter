-- =====================================================
-- SOLUÇÃO DEFINITIVA PARA ERRO PGRST202 - log_auth_event
-- =====================================================
-- Esta migração resolve definitivamente o problema da função log_auth_event
-- que não está sendo encontrada no schema cache do PostgREST

-- 1. REMOVER TODAS AS VERSÕES ANTERIORES DA FUNÇÃO
-- =====================================================
DO $$
BEGIN
    -- Remover todas as possíveis versões da função log_auth_event
    DROP FUNCTION IF EXISTS public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS public.log_auth_event(p_user_id UUID, p_event_type TEXT, p_event_data JSONB, p_ip_address INET, p_user_agent TEXT) CASCADE;
    DROP FUNCTION IF EXISTS public.log_auth_event(TEXT, INET, TEXT, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.log_auth_event(p_event_type TEXT, p_ip_address INET, p_user_agent TEXT, p_user_id UUID) CASCADE;
    
    RAISE NOTICE 'Todas as versões anteriores da função log_auth_event foram removidas';
END $$;

-- 2. VERIFICAR SE A TABELA audit_logs EXISTE E ESTÁ CORRETA
-- =====================================================
DO $$
BEGIN
    -- Verificar se a tabela audit_logs existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        RAISE EXCEPTION 'Tabela audit_logs não encontrada. Execute as migrações anteriores primeiro.';
    END IF;
    
    RAISE NOTICE 'Tabela audit_logs confirmada como existente';
END $$;

-- 3. CRIAR A FUNÇÃO log_auth_event COM A ASSINATURA EXATA ESPERADA
-- =====================================================
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
    
    -- Validar tipos de evento permitidos
    IF p_event_type NOT IN (
        'first_access_started',
        'first_access_completed', 
        'password_reset_attempted',
        'password_reset_failed',
        'password_reset_success',
        'user_sync_performed',
        'auth_diagnostic_run',
        'login_attempt',
        'login_success',
        'login_failed',
        'logout_attempted',
        'logout_success',
        'logout_failed',
        'sync_required',
        'sync_check_completed'
    ) THEN
        RAISE EXCEPTION 'Tipo de evento inválido: %', p_event_type;
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

-- 4. CONFIGURAR PERMISSÕES ADEQUADAS
-- =====================================================
-- Permitir acesso para usuários anônimos, autenticados e service_role
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) TO service_role;

-- 5. ADICIONAR COMENTÁRIO PARA DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION public.log_auth_event(UUID, TEXT, JSONB, INET, TEXT) IS 
'Função para registrar eventos de auditoria de autenticação. Retorna o UUID do log criado.';

-- 6. FORÇAR ATUALIZAÇÃO DO SCHEMA CACHE DO POSTGREST
-- =====================================================
-- Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

-- Forçar uma atualização do cache
DO $$
BEGIN
    PERFORM pg_notify('pgrst', 'reload schema');
    RAISE NOTICE 'Schema cache do PostgREST foi notificado para recarregar';
END $$;

-- 7. TESTE BÁSICO DA FUNÇÃO
-- =====================================================
DO $$
DECLARE
    test_log_id UUID;
BEGIN
    -- Testar a função com parâmetros básicos
    SELECT public.log_auth_event(
        NULL,
        'login_attempt',
        '{"test": "migration_test", "timestamp": "' || NOW()::text || '"}'::jsonb,
        NULL,
        'Migration Test User Agent'
    ) INTO test_log_id;
    
    IF test_log_id IS NOT NULL THEN
        RAISE NOTICE 'Teste da função log_auth_event PASSOU! ID do log: %', test_log_id;
        
        -- Limpar o log de teste
        DELETE FROM public.audit_logs WHERE id = test_log_id;
        RAISE NOTICE 'Log de teste removido com sucesso';
    ELSE
        RAISE EXCEPTION 'Teste da função log_auth_event FALHOU!';
    END IF;
END $$;

-- 8. VERIFICAÇÃO FINAL
-- =====================================================
DO $$
BEGIN
    -- Verificar se a função existe no information_schema
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'log_auth_event'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE NOTICE '✅ Função log_auth_event criada com sucesso e disponível no schema';
    ELSE
        RAISE EXCEPTION '❌ Função log_auth_event não foi encontrada após criação';
    END IF;
END $$;

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA COM SUCESSO
-- =====================================================
-- A função log_auth_event agora está disponível com a assinatura:
-- log_auth_event(p_user_id UUID, p_event_type TEXT, p_event_data JSONB, p_ip_address INET, p_user_agent TEXT)
-- 
-- Todos os parâmetros são opcionais (DEFAULT NULL) para máxima flexibilidade
-- A função retorna o UUID do log criado
-- O PostgREST foi notificado para recarregar o schema cache
-- =====================================================