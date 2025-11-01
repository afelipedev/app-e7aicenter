-- Migração para atualizar tabela companies e criar payroll_files

-- Adicionar coluna created_by na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Atualizar empresas existentes para ter o primeiro usuário como criador
UPDATE public.companies 
SET created_by = (SELECT auth_user_id FROM public.users WHERE role = 'administrator' LIMIT 1)
WHERE created_by IS NULL;

-- Tabela de arquivos de holerites
CREATE TABLE IF NOT EXISTS public.payroll_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    competencia VARCHAR(7) NOT NULL, -- Formato MM/AAAA
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    s3_url TEXT,
    excel_url TEXT,
    extracted_data JSONB,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_files_company_id ON public.payroll_files(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_files_status ON public.payroll_files(status);
CREATE INDEX IF NOT EXISTS idx_payroll_files_competencia ON public.payroll_files(competencia);
CREATE INDEX IF NOT EXISTS idx_payroll_files_created_at ON public.payroll_files(created_at);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela payroll_files
CREATE TRIGGER update_payroll_files_updated_at 
    BEFORE UPDATE ON public.payroll_files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para companies (atualizar existentes)
DROP POLICY IF EXISTS "Users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;

-- Política para visualizar empresas (usuários autenticados)
CREATE POLICY "Users can view companies" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para inserir empresas (usuários autenticados)
CREATE POLICY "Users can insert companies" ON public.companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Política para atualizar empresas (criador ou admin)
CREATE POLICY "Users can update own companies" ON public.companies
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (auth.uid() = created_by OR 
         EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator'))
    );

-- Política para deletar empresas (criador ou admin)
CREATE POLICY "Users can delete own companies" ON public.companies
    FOR DELETE USING (
        auth.role() = 'authenticated' AND 
        (auth.uid() = created_by OR 
         EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator'))
    );

-- Políticas RLS para payroll_files
ALTER TABLE public.payroll_files ENABLE ROW LEVEL SECURITY;

-- Política para visualizar arquivos de holerites
CREATE POLICY "Users can view payroll files" ON public.payroll_files
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = payroll_files.company_id AND 
            (c.created_by = auth.uid() OR 
             EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator'))
        )
    );

-- Política para inserir arquivos de holerites
CREATE POLICY "Users can insert payroll files" ON public.payroll_files
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = payroll_files.company_id AND 
            (c.created_by = auth.uid() OR 
             EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator'))
        )
    );

-- Política para atualizar arquivos de holerites
CREATE POLICY "Users can update payroll files" ON public.payroll_files
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = payroll_files.company_id AND 
            (c.created_by = auth.uid() OR 
             EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator'))
        )
    );

-- Política para deletar arquivos de holerites
CREATE POLICY "Users can delete payroll files" ON public.payroll_files
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.companies c 
            WHERE c.id = payroll_files.company_id AND 
            (c.created_by = auth.uid() OR 
             EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator'))
        )
    );

-- Função para obter estatísticas de holerites por empresa
CREATE OR REPLACE FUNCTION get_payroll_stats(company_uuid UUID)
RETURNS TABLE (
    total_files BIGINT,
    files_this_week BIGINT,
    files_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as files_this_week,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as files_this_month
    FROM public.payroll_files 
    WHERE company_id = company_uuid AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar CNPJ (básica)
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cnpj_input := REGEXP_REPLACE(cnpj_input, '[^0-9]', '', 'g');
    
    -- Verifica se tem 14 dígitos
    IF LENGTH(cnpj_input) != 14 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos os dígitos iguais
    IF cnpj_input ~ '^(.)\1{13}$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Constraint para validar CNPJ
ALTER TABLE public.companies 
DROP CONSTRAINT IF EXISTS valid_cnpj;

ALTER TABLE public.companies 
ADD CONSTRAINT valid_cnpj CHECK (validate_cnpj(cnpj));

-- Grants para as funções
GRANT EXECUTE ON FUNCTION get_payroll_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_cnpj(TEXT) TO authenticated;

-- Comentários nas tabelas
COMMENT ON TABLE public.payroll_files IS 'Tabela de arquivos de holerites processados';

COMMENT ON COLUMN public.companies.created_by IS 'Usuário que criou a empresa';
COMMENT ON COLUMN public.payroll_files.competencia IS 'Competência do holerite no formato MM/AAAA';
COMMENT ON COLUMN public.payroll_files.status IS 'Status do processamento: pending, processing, completed, error';
COMMENT ON COLUMN public.payroll_files.extracted_data IS 'Dados extraídos do PDF pelo processamento de IA';