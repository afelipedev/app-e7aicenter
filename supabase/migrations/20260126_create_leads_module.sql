-- Migration: 20260126_create_leads_module
-- Description: Módulo de Leads (clientes/fornecedores), templates e placeholders
-- Created: 2026-01-26

-- =====================================================
-- 1) TABELAS: LEADS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type VARCHAR(20) NULL,
  company_name TEXT NULL,
  cnpj TEXT NULL,
  address TEXT NULL,
  cnae_or_activity TEXT NULL,
  avg_revenue NUMERIC(15, 2) NULL,
  avg_employees INTEGER NULL,
  partners TEXT NULL,
  decision_makers TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leads_lead_type_check CHECK (
    lead_type IS NULL OR lead_type IN ('cliente', 'fornecedor')
  )
);

CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON public.leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_company_name ON public.leads(company_name);
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON public.leads(cnpj);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Telefones
CREATE TABLE IF NOT EXISTS public.lead_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_phones_lead_id ON public.lead_phones(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_phones_primary_per_lead
  ON public.lead_phones(lead_id)
  WHERE is_primary = true;

-- E-mails
CREATE TABLE IF NOT EXISTS public.lead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON public.lead_emails(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_emails_primary_per_lead
  ON public.lead_emails(lead_id)
  WHERE is_primary = true;

-- =====================================================
-- 2) TABELAS: TEMPLATES / CATEGORIAS / PLACEHOLDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.message_template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_message_template_categories_updated_at
  BEFORE UPDATE ON public.message_template_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_id UUID NULL REFERENCES public.message_template_categories(id) ON DELETE SET NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_text TEXT NULL,
  tags TEXT[] NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_category_id ON public.message_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON public.message_templates(is_active);

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.message_template_placeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  example TEXT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3) RLS (GLOBAL): authenticated pode CRUD
-- =====================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_template_placeholders ENABLE ROW LEVEL SECURITY;

-- Leads
CREATE POLICY "authenticated_select_leads" ON public.leads
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_leads" ON public.leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_leads" ON public.leads
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_leads" ON public.leads
  FOR DELETE USING (auth.role() = 'authenticated');

-- Lead phones
CREATE POLICY "authenticated_select_lead_phones" ON public.lead_phones
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_lead_phones" ON public.lead_phones
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_lead_phones" ON public.lead_phones
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_lead_phones" ON public.lead_phones
  FOR DELETE USING (auth.role() = 'authenticated');

-- Lead emails
CREATE POLICY "authenticated_select_lead_emails" ON public.lead_emails
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_lead_emails" ON public.lead_emails
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_lead_emails" ON public.lead_emails
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_lead_emails" ON public.lead_emails
  FOR DELETE USING (auth.role() = 'authenticated');

-- Categories
CREATE POLICY "authenticated_select_message_template_categories" ON public.message_template_categories
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_message_template_categories" ON public.message_template_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_message_template_categories" ON public.message_template_categories
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_message_template_categories" ON public.message_template_categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- Templates
CREATE POLICY "authenticated_select_message_templates" ON public.message_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_message_templates" ON public.message_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_message_templates" ON public.message_templates
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_message_templates" ON public.message_templates
  FOR DELETE USING (auth.role() = 'authenticated');

-- Placeholders
CREATE POLICY "authenticated_select_message_template_placeholders" ON public.message_template_placeholders
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert_message_template_placeholders" ON public.message_template_placeholders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_message_template_placeholders" ON public.message_template_placeholders
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_message_template_placeholders" ON public.message_template_placeholders
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 4) SEED: Categorias e Placeholders do sistema
-- =====================================================

INSERT INTO public.message_template_categories (name, is_system)
VALUES
  ('Atendimento', true),
  ('CadastroInicial', true),
  ('Suporte', true),
  ('Marketing', true),
  ('Cobranca', true),
  ('DatasComemorativas', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.message_template_placeholders (key, label, example, is_system)
VALUES
  ('nome_lead', 'Nome da empresa', 'Empresa XPTO LTDA', true),
  ('tipo_lead', 'Tipo de Lead', 'cliente', true),
  ('cnpj_lead', 'CNPJ', '00.000.000/0001-00', true),
  ('endereco_lead', 'Endereço', 'Rua Exemplo, 123', true),
  ('cnae_lead', 'CNAE / Ramo de atividade', '6201-5/01', true),
  ('media_faturamento_lead', 'Média de faturamento', '150000.00', true),
  ('media_funcionarios_lead', 'Média de funcionários', '12', true),
  ('quadro_societario_lead', 'Quadro societário', 'Fulano; Sicrano', true),
  ('tomadores_decisao_lead', 'Tomadores de decisão', 'Fulano (Diretor)', true),
  ('telefone_principal_lead', 'Telefone principal', '+55 11 99999-9999', true),
  ('email_principal_lead', 'Email principal', 'contato@empresa.com', true)
ON CONFLICT (key) DO NOTHING;

