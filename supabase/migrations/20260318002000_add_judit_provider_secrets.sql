-- Fallback seguro para credenciais da Judit
-- Usado quando os secrets da Edge Function ainda não foram configurados no projeto remoto.

CREATE TABLE IF NOT EXISTS public.judit_provider_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL DEFAULT 'Judit',
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT 'https://requests.prod.judit.io',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_judit_provider_secrets_single_active
    ON public.judit_provider_secrets (provider_name, is_active)
    WHERE is_active = true;

ALTER TABLE public.judit_provider_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to judit provider secrets" ON public.judit_provider_secrets;
CREATE POLICY "No direct access to judit provider secrets"
    ON public.judit_provider_secrets
    FOR ALL
    USING (false)
    WITH CHECK (false);

DROP TRIGGER IF EXISTS update_judit_provider_secrets_updated_at ON public.judit_provider_secrets;
CREATE TRIGGER update_judit_provider_secrets_updated_at
    BEFORE UPDATE ON public.judit_provider_secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Nao versionar credenciais em migrations.
-- Configure `JUDIT_API_KEY` como secret da Edge Function ou insira
-- manualmente na tabela em ambiente seguro, se realmente precisar do fallback.
