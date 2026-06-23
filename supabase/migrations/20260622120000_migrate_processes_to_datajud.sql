-- Migração do módulo de Consultas Processuais: Judit -> DataJud (CNJ)
-- Remove integralmente as estruturas exclusivas da Judit (monitoramento e
-- relatório de consumo/billing) e adapta as tabelas remanescentes à API
-- pública do DataJud, que é síncrona, gratuita e somente de metadados.

-- 1. Recria a policy de SELECT de process_snapshots SEM a referência a
--    process_monitorings (tabela que será removida abaixo). O acesso passa a
--    ser garantido por process_request_results (histórico de consultas) e
--    process_user_state (favoritos).
DROP POLICY IF EXISTS "Users view accessible process snapshots" ON public.process_snapshots;
CREATE POLICY "Users view accessible process snapshots"
    ON public.process_snapshots
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.process_request_results prr
            JOIN public.process_query_requests pqr
                ON pqr.id = prr.process_query_request_id
            WHERE prr.process_snapshot_id = process_snapshots.id
              AND pqr.auth_user_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1
            FROM public.process_user_state pus
            WHERE pus.process_snapshot_id = process_snapshots.id
              AND pus.auth_user_id = (SELECT auth.uid())
        )
    );

-- 2. Monitoramento (tracking) não existe na DataJud — remover tabela.
DROP TABLE IF EXISTS public.process_monitorings CASCADE;

-- 3. Relatório de consumo/billing não se aplica (API gratuita) — remover.
DROP VIEW IF EXISTS public.judit_consumption_monthly_view CASCADE;
DROP TABLE IF EXISTS public.judit_requests CASCADE;
DROP TABLE IF EXISTS public.judit_sync_runs CASCADE;
DROP TABLE IF EXISTS public.judit_billing_settings CASCADE;

-- 4. Segredo de provedor da Judit — remover (DataJud usa APIKey pública via
--    secret DATAJUD_API_KEY na Edge Function).
DROP TABLE IF EXISTS public.judit_provider_secrets CASCADE;

-- 5. Ajustes em process_query_requests para o contrato DataJud:
--    - request_kind passa a aceitar 'advanced' (busca avançada) no lugar de 'history';
--    - remove colunas específicas da Judit (judit_request_id e o add-on de anexos).
ALTER TABLE public.process_query_requests
    DROP CONSTRAINT IF EXISTS process_query_requests_request_kind_check;

-- Normaliza registros legados antes de aplicar o novo CHECK.
UPDATE public.process_query_requests
    SET request_kind = 'advanced'
    WHERE request_kind = 'history';

ALTER TABLE public.process_query_requests
    ADD CONSTRAINT process_query_requests_request_kind_check
    CHECK (request_kind IN ('cnj', 'advanced', 'detail_refresh'));

ALTER TABLE public.process_query_requests
    DROP CONSTRAINT IF EXISTS process_query_requests_judit_request_id_key;

ALTER TABLE public.process_query_requests
    DROP COLUMN IF EXISTS judit_request_id,
    DROP COLUMN IF EXISTS requested_with_attachments;

-- Índice antigo por (request_kind, search_type) permanece válido.
