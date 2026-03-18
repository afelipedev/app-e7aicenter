-- Judit consumption reporting
-- Persiste histórico de requests, sincronizações e configuração de cobrança.

CREATE TABLE IF NOT EXISTS public.judit_billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL DEFAULT 'Judit',
    contract_name TEXT NOT NULL DEFAULT 'Plano base',
    included_amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
    max_monthly_amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    pricing_version TEXT NOT NULL DEFAULT '2026-03-17-v1',
    pricing_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    active_from DATE NOT NULL DEFAULT CURRENT_DATE,
    active_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_judit_billing_settings_single_active
    ON public.judit_billing_settings (is_active)
    WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.judit_sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_start_date DATE NOT NULL,
    request_end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'error')),
    pages_fetched INTEGER NOT NULL DEFAULT 0,
    requests_imported INTEGER NOT NULL DEFAULT 0,
    requests_processed INTEGER NOT NULL DEFAULT 0,
    force_sync BOOLEAN NOT NULL DEFAULT false,
    last_page INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    triggered_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judit_sync_runs_dates
    ON public.judit_sync_runs (request_start_date, request_end_date);

CREATE INDEX IF NOT EXISTS idx_judit_sync_runs_status
    ON public.judit_sync_runs (status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.judit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE,
    origin VARCHAR(20) NOT NULL,
    origin_id TEXT,
    external_user_id UUID,
    external_company_id UUID,
    status VARCHAR(30) NOT NULL,
    created_at_judit TIMESTAMPTZ NOT NULL,
    updated_at_judit TIMESTAMPTZ,
    billing_reference_month DATE NOT NULL,
    search_type VARCHAR(50),
    response_type VARCHAR(50),
    search_key_masked TEXT,
    on_demand BOOLEAN NOT NULL DEFAULT false,
    with_attachments BOOLEAN NOT NULL DEFAULT false,
    public_search BOOLEAN NOT NULL DEFAULT false,
    plan_config_type TEXT,
    filters_count INTEGER,
    product_name TEXT,
    cost_brl NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cost_type VARCHAR(20) NOT NULL DEFAULT 'estimated',
    cost_confidence VARCHAR(30) NOT NULL DEFAULT 'estimated'
        CHECK (cost_confidence IN ('exact', 'estimated', 'pending_enrichment', 'unknown')),
    returned_items_count INTEGER,
    returned_batches INTEGER,
    has_overage BOOLEAN NOT NULL DEFAULT false,
    pricing_version TEXT NOT NULL DEFAULT '2026-03-17-v1',
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    pricing_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    sync_run_id UUID REFERENCES public.judit_sync_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judit_requests_billing_reference_month
    ON public.judit_requests (billing_reference_month DESC);

CREATE INDEX IF NOT EXISTS idx_judit_requests_created_at_judit
    ON public.judit_requests (created_at_judit DESC);

CREATE INDEX IF NOT EXISTS idx_judit_requests_origin_search_status
    ON public.judit_requests (origin, search_type, status);

CREATE INDEX IF NOT EXISTS idx_judit_requests_product_name
    ON public.judit_requests (product_name);

CREATE INDEX IF NOT EXISTS idx_judit_requests_sync_run_id
    ON public.judit_requests (sync_run_id);

CREATE INDEX IF NOT EXISTS idx_judit_requests_flags
    ON public.judit_requests (with_attachments, on_demand, public_search);

CREATE OR REPLACE VIEW public.judit_consumption_monthly_view AS
WITH active_settings AS (
    SELECT
        included_amount_brl,
        max_monthly_amount_brl
    FROM public.judit_billing_settings
    WHERE is_active = true
    ORDER BY active_from DESC, created_at DESC
    LIMIT 1
)
SELECT
    jr.billing_reference_month,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE jr.status = 'completed') AS completed_requests,
    COUNT(*) FILTER (WHERE jr.status <> 'completed') AS non_completed_requests,
    COUNT(*) FILTER (WHERE jr.origin = 'api') AS api_requests,
    COUNT(*) FILTER (WHERE jr.origin = 'tracking') AS tracking_requests,
    COUNT(*) FILTER (WHERE jr.with_attachments) AS attachment_requests,
    COALESCE(SUM(jr.cost_brl), 0)::NUMERIC(12, 2) AS consumed_amount_brl,
    COALESCE(settings.included_amount_brl, 1000.00)::NUMERIC(12, 2) AS included_amount_brl,
    COALESCE(settings.max_monthly_amount_brl, 5000.00)::NUMERIC(12, 2) AS max_monthly_amount_brl,
    GREATEST(COALESCE(settings.included_amount_brl, 1000.00) - COALESCE(SUM(jr.cost_brl), 0), 0)::NUMERIC(12, 2) AS remaining_included_amount_brl,
    GREATEST(COALESCE(SUM(jr.cost_brl), 0) - COALESCE(settings.included_amount_brl, 1000.00), 0)::NUMERIC(12, 2) AS overage_amount_brl,
    GREATEST(COALESCE(settings.max_monthly_amount_brl, 5000.00) - COALESCE(SUM(jr.cost_brl), 0), 0)::NUMERIC(12, 2) AS remaining_until_block_amount_brl
FROM public.judit_requests jr
LEFT JOIN active_settings settings ON TRUE
GROUP BY
    jr.billing_reference_month,
    settings.included_amount_brl,
    settings.max_monthly_amount_brl;

ALTER TABLE public.judit_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judit_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view judit billing settings"
    ON public.judit_billing_settings
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view judit sync runs"
    ON public.judit_sync_runs
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view judit requests"
    ON public.judit_requests
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_judit_billing_settings_updated_at ON public.judit_billing_settings;
CREATE TRIGGER update_judit_billing_settings_updated_at
    BEFORE UPDATE ON public.judit_billing_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_judit_sync_runs_updated_at ON public.judit_sync_runs;
CREATE TRIGGER update_judit_sync_runs_updated_at
    BEFORE UPDATE ON public.judit_sync_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_judit_requests_updated_at ON public.judit_requests;
CREATE TRIGGER update_judit_requests_updated_at
    BEFORE UPDATE ON public.judit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.judit_billing_settings (
    provider_name,
    contract_name,
    included_amount_brl,
    max_monthly_amount_brl,
    pricing_version,
    pricing_rules,
    active_from,
    is_active
)
SELECT
    'Judit',
    'Plano minimo contratado',
    1000.00,
    5000.00,
    '2026-03-17-v1',
    $${
      "currency": "BRL",
      "included_amount_brl": 1000,
      "max_monthly_amount_brl": 5000,
      "products": {
        "process_consultation": { "label": "Consulta processual", "price_brl": 0.25, "billing_unit": "request" },
        "historical_datalake": { "label": "Consulta historica (Data Lake)", "price_brl": 1.50, "billing_unit": "request" },
        "historical_on_demand": { "label": "Consulta historica (On Demand)", "price_brl": 6.00, "billing_unit": "per_1000_returned_processes" },
        "attachments": { "label": "Autos processuais (Anexos)", "price_brl": 3.50, "billing_unit": "request" },
        "lawsuit_monitoring": { "label": "Monitoramento processual", "price_brl": 1.50, "billing_unit": "request" },
        "new_lawsuit_monitoring": { "label": "Monitoramento de novas acoes", "price_brl": 15.00, "billing_unit": "request" },
        "custom_monitoring_base": { "label": "Monitoramento customizado", "price_brl": 100.00, "billing_unit": "request" },
        "custom_monitoring_captured_process": { "label": "Processo capturado em monitoramento customizado", "price_brl": 0.25, "billing_unit": "captured_process" },
        "arrest_warrant": { "label": "Mandado de prisao", "price_brl": 1.00, "billing_unit": "request" },
        "criminal_execution": { "label": "Execucao criminal", "price_brl": 0.50, "billing_unit": "request" },
        "registry_datalake": { "label": "Dados cadastrais (Data Lake)", "price_brl": 0.12, "billing_unit": "request" },
        "registry_on_demand": { "label": "Dados cadastrais (On Demand)", "price_brl": 0.15, "billing_unit": "request" },
        "historical_synthetic": { "label": "Consulta historica sintetica", "price_brl": 0.75, "billing_unit": "request" },
        "historical_simple_counter": { "label": "Consulta historica simples (Contador)", "price_brl": 0.50, "billing_unit": "request" },
        "process_summary_ai": { "label": "Resumo de processo (IA)", "price_brl": 0.10, "billing_unit": "request" },
        "entity_summary_ai": { "label": "Resumo de entidade (IA)", "price_brl": 0.15, "billing_unit": "request" }
      }
    }$$::jsonb,
    CURRENT_DATE,
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM public.judit_billing_settings
    WHERE pricing_version = '2026-03-17-v1'
);
