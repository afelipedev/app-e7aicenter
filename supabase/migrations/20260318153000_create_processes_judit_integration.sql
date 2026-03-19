-- Integração Judit para módulos de processos
-- Estrutura base para consultas, snapshots, monitoramentos e agente processual.

CREATE TABLE IF NOT EXISTS public.process_query_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    judit_request_id UUID,
    request_kind TEXT NOT NULL CHECK (request_kind IN ('cnj', 'history', 'detail_refresh')),
    search_type TEXT NOT NULL,
    search_key_hash TEXT,
    search_key_masked TEXT,
    search_value_label TEXT,
    response_type TEXT,
    requested_with_attachments BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending',
    source_module TEXT NOT NULL DEFAULT 'processes',
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT process_query_requests_judit_request_id_key UNIQUE NULLS NOT DISTINCT (judit_request_id)
);

CREATE TABLE IF NOT EXISTS public.process_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnj TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    active_party TEXT,
    passive_party TEXT,
    tribunal TEXT,
    grade TEXT,
    created_at_label TEXT,
    distributed_at_label TEXT,
    status TEXT,
    orgao_julgador TEXT,
    class_processual TEXT,
    assuntos JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    parties JSONB NOT NULL DEFAULT '[]'::jsonb,
    value_label TEXT,
    last_movement TEXT,
    summary TEXT,
    movements JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_processes JSONB NOT NULL DEFAULT '[]'::jsonb,
    origin_tribunal TEXT,
    comarca TEXT,
    city TEXT,
    state TEXT,
    justice_segment TEXT,
    phase TEXT,
    judge_relator TEXT,
    ai_disclaimer TEXT,
    last_request_id UUID REFERENCES public.process_query_requests(id) ON DELETE SET NULL,
    last_response_id TEXT,
    source_kind TEXT NOT NULL DEFAULT 'query' CHECK (source_kind IN ('query', 'history', 'detail', 'monitoring')),
    completeness TEXT NOT NULL DEFAULT 'summary' CHECK (completeness IN ('summary', 'full')),
    raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_request_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_query_request_id UUID NOT NULL REFERENCES public.process_query_requests(id) ON DELETE CASCADE,
    process_snapshot_id UUID NOT NULL REFERENCES public.process_snapshots(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT process_request_results_unique UNIQUE (process_query_request_id, process_snapshot_id)
);

CREATE TABLE IF NOT EXISTS public.process_monitorings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_snapshot_id UUID REFERENCES public.process_snapshots(id) ON DELETE SET NULL,
    tracking_id UUID NOT NULL UNIQUE,
    monitoring_kind TEXT NOT NULL CHECK (monitoring_kind IN ('process', 'document')),
    search_type TEXT NOT NULL,
    search_key_hash TEXT,
    search_key_masked TEXT,
    search_value_label TEXT NOT NULL,
    label TEXT NOT NULL,
    scope TEXT NOT NULL,
    recurrence INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'created',
    remote_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.process_user_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_snapshot_id UUID NOT NULL REFERENCES public.process_snapshots(id) ON DELETE CASCADE,
    is_favorite BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT process_user_state_unique UNIQUE (auth_user_id, process_snapshot_id)
);

CREATE TABLE IF NOT EXISTS public.process_agent_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    process_snapshot_id UUID NOT NULL REFERENCES public.process_snapshots(id) ON DELETE CASCADE,
    snapshot_hash TEXT NOT NULL,
    model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    summary_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_response JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT process_agent_summaries_unique UNIQUE (auth_user_id, process_snapshot_id, snapshot_hash)
);

CREATE INDEX IF NOT EXISTS idx_process_query_requests_user_status
    ON public.process_query_requests (auth_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_process_query_requests_kind_search
    ON public.process_query_requests (request_kind, search_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_process_request_results_request
    ON public.process_request_results (process_query_request_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_process_request_results_snapshot
    ON public.process_request_results (process_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_process_snapshots_cnj
    ON public.process_snapshots (cnj);

CREATE INDEX IF NOT EXISTS idx_process_snapshots_updated_at
    ON public.process_snapshots (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_process_monitorings_user_status
    ON public.process_monitorings (auth_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_process_monitorings_snapshot
    ON public.process_monitorings (process_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_process_user_state_user_flags
    ON public.process_user_state (auth_user_id, is_favorite, is_deleted);

CREATE INDEX IF NOT EXISTS idx_process_agent_summaries_snapshot
    ON public.process_agent_summaries (process_snapshot_id, created_at DESC);

ALTER TABLE public.process_query_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_request_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_monitorings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_agent_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own process query requests" ON public.process_query_requests;
CREATE POLICY "Users manage own process query requests"
    ON public.process_query_requests
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id);

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
        OR EXISTS (
            SELECT 1
            FROM public.process_monitorings pm
            WHERE pm.process_snapshot_id = process_snapshots.id
              AND pm.auth_user_id = (SELECT auth.uid())
              AND pm.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Users view own request results" ON public.process_request_results;
CREATE POLICY "Users view own request results"
    ON public.process_request_results
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.process_query_requests pqr
            WHERE pqr.id = process_request_results.process_query_request_id
              AND pqr.auth_user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users manage own monitorings" ON public.process_monitorings;
CREATE POLICY "Users manage own monitorings"
    ON public.process_monitorings
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id);

DROP POLICY IF EXISTS "Users manage own process state" ON public.process_user_state;
CREATE POLICY "Users manage own process state"
    ON public.process_user_state
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id);

DROP POLICY IF EXISTS "Users manage own process agent summaries" ON public.process_agent_summaries;
CREATE POLICY "Users manage own process agent summaries"
    ON public.process_agent_summaries
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = auth_user_id);

DROP TRIGGER IF EXISTS update_process_query_requests_updated_at ON public.process_query_requests;
CREATE TRIGGER update_process_query_requests_updated_at
    BEFORE UPDATE ON public.process_query_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_process_snapshots_updated_at ON public.process_snapshots;
CREATE TRIGGER update_process_snapshots_updated_at
    BEFORE UPDATE ON public.process_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_process_monitorings_updated_at ON public.process_monitorings;
CREATE TRIGGER update_process_monitorings_updated_at
    BEFORE UPDATE ON public.process_monitorings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_process_user_state_updated_at ON public.process_user_state;
CREATE TRIGGER update_process_user_state_updated_at
    BEFORE UPDATE ON public.process_user_state
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_process_agent_summaries_updated_at ON public.process_agent_summaries;
CREATE TRIGGER update_process_agent_summaries_updated_at
    BEFORE UPDATE ON public.process_agent_summaries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER VIEW public.judit_consumption_monthly_view SET (security_invoker = true);
