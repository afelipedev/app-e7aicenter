-- Corrige a constraint de process_query_requests para permitir
-- múltiplas linhas locais antes da sincronização remota sem colidir em NULL.

ALTER TABLE public.process_query_requests
    DROP CONSTRAINT IF EXISTS process_query_requests_judit_request_id_key;

DROP INDEX IF EXISTS public.process_query_requests_judit_request_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_query_requests_judit_request_id
    ON public.process_query_requests (judit_request_id)
    WHERE judit_request_id IS NOT NULL;
