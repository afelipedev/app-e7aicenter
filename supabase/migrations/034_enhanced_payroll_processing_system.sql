-- Enhanced Payroll Processing System Migration
-- Implements comprehensive payroll processing with AI integration, logs, and rubric patterns

-- =====================================================
-- 1. PAYROLL PROCESSING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payroll_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    competency VARCHAR(7) NOT NULL, -- MM/AAAA
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    result_file_path TEXT,
    result_file_url TEXT,
    extracted_data JSONB,
    error_message TEXT,
    webhook_response JSONB,
    estimated_time INTEGER, -- em minutos
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    initiated_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para payroll_processing
CREATE INDEX IF NOT EXISTS idx_payroll_processing_company_id ON public.payroll_processing(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_processing_status ON public.payroll_processing(status);
CREATE INDEX IF NOT EXISTS idx_payroll_processing_competency ON public.payroll_processing(competency);
CREATE INDEX IF NOT EXISTS idx_payroll_processing_started_at ON public.payroll_processing(started_at DESC);

-- =====================================================
-- 2. PROCESSING LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_id UUID NOT NULL REFERENCES public.payroll_processing(id) ON DELETE CASCADE,
    log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para processing_logs
CREATE INDEX IF NOT EXISTS idx_processing_logs_processing_id ON public.processing_logs(processing_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_level ON public.processing_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON public.processing_logs(created_at DESC);

-- =====================================================
-- 3. RUBRIC PATTERNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rubric_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(255) NOT NULL,
    pattern_regex TEXT NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    rubric_type VARCHAR(50) NOT NULL CHECK (rubric_type IN ('provento', 'desconto', 'base')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para rubric_patterns
CREATE INDEX IF NOT EXISTS idx_rubric_patterns_type ON public.rubric_patterns(rubric_type);
CREATE INDEX IF NOT EXISTS idx_rubric_patterns_active ON public.rubric_patterns(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rubric_patterns_name ON public.rubric_patterns(pattern_name) WHERE is_active = true;

-- =====================================================
-- 4. EXTRACTED RUBRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.extracted_rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processing_id UUID NOT NULL REFERENCES public.payroll_processing(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    normalized_name VARCHAR(255),
    value DECIMAL(15,2),
    rubric_type VARCHAR(50) CHECK (rubric_type IN ('provento', 'desconto', 'base')),
    pattern_id UUID REFERENCES public.rubric_patterns(id),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para extracted_rubrics
CREATE INDEX IF NOT EXISTS idx_extracted_rubrics_processing_id ON public.extracted_rubrics(processing_id);
CREATE INDEX IF NOT EXISTS idx_extracted_rubrics_type ON public.extracted_rubrics(rubric_type);
CREATE INDEX IF NOT EXISTS idx_extracted_rubrics_pattern_id ON public.extracted_rubrics(pattern_id);

-- =====================================================
-- 5. PAYROLL FILES PROCESSING RELATIONSHIP
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payroll_files_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_file_id UUID NOT NULL REFERENCES public.payroll_files(id) ON DELETE CASCADE,
    processing_id UUID NOT NULL REFERENCES public.payroll_processing(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_file_id, processing_id)
);

-- Índices para payroll_files_processing
CREATE INDEX IF NOT EXISTS idx_payroll_files_processing_file_id ON public.payroll_files_processing(payroll_file_id);
CREATE INDEX IF NOT EXISTS idx_payroll_files_processing_processing_id ON public.payroll_files_processing(processing_id);

-- =====================================================
-- 6. TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para payroll_processing
CREATE TRIGGER update_payroll_processing_updated_at 
    BEFORE UPDATE ON public.payroll_processing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para rubric_patterns
CREATE TRIGGER update_rubric_patterns_updated_at 
    BEFORE UPDATE ON public.rubric_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.payroll_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_files_processing ENABLE ROW LEVEL SECURITY;

-- Políticas para payroll_processing
CREATE POLICY "Users can view processing of their companies" ON public.payroll_processing
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT c.id FROM public.companies c 
            WHERE c.created_by = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
        )
    );

CREATE POLICY "Users can create processing for their companies" ON public.payroll_processing
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT c.id FROM public.companies c 
            WHERE c.created_by = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
        )
    );

CREATE POLICY "Users can update processing of their companies" ON public.payroll_processing
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        company_id IN (
            SELECT c.id FROM public.companies c 
            WHERE c.created_by = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
        )
    );

-- Políticas para processing_logs
CREATE POLICY "Users can view logs of their processing" ON public.processing_logs
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        processing_id IN (
            SELECT id FROM public.payroll_processing 
            WHERE company_id IN (
                SELECT c.id FROM public.companies c 
                WHERE c.created_by = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
            )
        )
    );

-- Políticas para rubric_patterns (todos podem ver, apenas admins podem modificar)
CREATE POLICY "All authenticated users can view rubric patterns" ON public.rubric_patterns
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify rubric patterns" ON public.rubric_patterns
    FOR ALL USING (
        auth.role() = 'authenticated' AND
        EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
    );

-- Políticas para extracted_rubrics
CREATE POLICY "Users can view extracted rubrics of their processing" ON public.extracted_rubrics
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        processing_id IN (
            SELECT id FROM public.payroll_processing 
            WHERE company_id IN (
                SELECT c.id FROM public.companies c 
                WHERE c.created_by = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
            )
        )
    );

-- Políticas para payroll_files_processing
CREATE POLICY "Users can view file processing relationships" ON public.payroll_files_processing
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        processing_id IN (
            SELECT id FROM public.payroll_processing 
            WHERE company_id IN (
                SELECT c.id FROM public.companies c 
                WHERE c.created_by = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'administrator')
            )
        )
    );

-- =====================================================
-- 8. FUNÇÕES DE SUPORTE
-- =====================================================

-- Função para iniciar processamento
CREATE OR REPLACE FUNCTION start_payroll_processing(
    p_file_ids UUID[],
    p_company_id UUID,
    p_competency VARCHAR(7)
) RETURNS UUID AS $$
DECLARE
    processing_id UUID;
    file_id UUID;
BEGIN
    -- Validar competência
    IF NOT (p_competency ~ '^(0[1-9]|1[0-2])\/\d{4}$') THEN
        RAISE EXCEPTION 'Competência inválida. Use o formato MM/AAAA';
    END IF;
    
    -- Criar registro de processamento
    INSERT INTO public.payroll_processing (company_id, competency, initiated_by)
    VALUES (p_company_id, p_competency, auth.uid())
    RETURNING id INTO processing_id;
    
    -- Associar arquivos ao processamento
    FOREACH file_id IN ARRAY p_file_ids
    LOOP
        INSERT INTO public.payroll_files_processing (payroll_file_id, processing_id)
        VALUES (file_id, processing_id);
        
        -- Atualizar status do arquivo
        UPDATE public.payroll_files 
        SET status = 'processing'
        WHERE id = file_id AND company_id = p_company_id;
    END LOOP;
    
    -- Log inicial
    INSERT INTO public.processing_logs (processing_id, log_level, message, metadata)
    VALUES (
        processing_id, 
        'INFO', 
        'Processamento iniciado',
        jsonb_build_object('file_count', array_length(p_file_ids, 1), 'competency', p_competency)
    );
    
    RETURN processing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para receber resultado do processamento
CREATE OR REPLACE FUNCTION receive_processing_result(
    p_processing_id UUID,
    p_status VARCHAR(20),
    p_progress INTEGER DEFAULT NULL,
    p_result_file_url TEXT DEFAULT NULL,
    p_extracted_data JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_webhook_response JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Atualizar processamento
    UPDATE public.payroll_processing 
    SET 
        status = p_status,
        progress = COALESCE(p_progress, CASE WHEN p_status = 'completed' THEN 100 ELSE progress END),
        result_file_url = p_result_file_url,
        extracted_data = p_extracted_data,
        error_message = p_error_message,
        webhook_response = p_webhook_response,
        completed_at = CASE WHEN p_status IN ('completed', 'error') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = p_processing_id;
    
    -- Atualizar status dos arquivos relacionados
    UPDATE public.payroll_files 
    SET status = CASE 
        WHEN p_status = 'completed' THEN 'completed'
        WHEN p_status = 'error' THEN 'error'
        ELSE status
    END
    WHERE id IN (
        SELECT payroll_file_id 
        FROM public.payroll_files_processing 
        WHERE processing_id = p_processing_id
    );
    
    -- Log do resultado
    INSERT INTO public.processing_logs (processing_id, log_level, message, metadata)
    VALUES (
        p_processing_id, 
        CASE WHEN p_status = 'completed' THEN 'INFO' ELSE 'ERROR' END,
        CASE 
            WHEN p_status = 'completed' THEN 'Processamento concluído com sucesso'
            WHEN p_status = 'error' THEN 'Erro no processamento'
            ELSE 'Status atualizado: ' || p_status
        END,
        jsonb_build_object(
            'status', p_status, 
            'progress', p_progress,
            'error', p_error_message,
            'has_result', p_result_file_url IS NOT NULL
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de processamento
CREATE OR REPLACE FUNCTION get_processing_stats(p_company_id UUID DEFAULT NULL)
RETURNS TABLE(
    total_processings BIGINT,
    completed_this_month BIGINT,
    in_progress BIGINT,
    total_files_processed BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_processings,
        COUNT(*) FILTER (WHERE status = 'completed' AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', NOW())) as completed_this_month,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) as in_progress,
        (SELECT COUNT(*) FROM public.payroll_files_processing pfp 
         JOIN public.payroll_processing pp ON pfp.processing_id = pp.id 
         WHERE (p_company_id IS NULL OR pp.company_id = p_company_id) AND pp.status = 'completed') as total_files_processed
    FROM public.payroll_processing
    WHERE p_company_id IS NULL OR company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. DADOS INICIAIS - PADRÕES DE RUBRICAS
-- =====================================================

INSERT INTO public.rubric_patterns (pattern_name, pattern_regex, normalized_name, rubric_type) VALUES
('Salário Base', '(?i)(sal[aá]rio|vencimento|ordenado).*base', 'SALARIO_BASE', 'provento'),
('Horas Extras', '(?i)(horas?.*extras?|h\.?e\.?)', 'HORAS_EXTRAS', 'provento'),
('Adicional Noturno', '(?i)(adicional.*noturno|ad\.?noturno)', 'ADICIONAL_NOTURNO', 'provento'),
('Insalubridade', '(?i)(insalubridade|insalub)', 'INSALUBRIDADE', 'provento'),
('Periculosidade', '(?i)(periculosidade|pericul)', 'PERICULOSIDADE', 'provento'),
('Comissões', '(?i)(comiss[ãa]o|comiss[õo]es)', 'COMISSOES', 'provento'),
('Gratificação', '(?i)(gratifica[çc][ãa]o)', 'GRATIFICACAO', 'provento'),
('13º Salário', '(?i)(13[ºo].*sal[aá]rio|d[eé]cimo.*terceiro)', 'DECIMO_TERCEIRO', 'provento'),
('Férias', '(?i)(f[eé]rias)', 'FERIAS', 'provento'),
('INSS', '(?i)(inss|prev.*social)', 'INSS', 'desconto'),
('IRRF', '(?i)(irrf|imp.*renda)', 'IRRF', 'desconto'),
('FGTS', '(?i)(fgts|fundo.*garantia)', 'FGTS', 'desconto'),
('Vale Transporte', '(?i)(vale.*transp|v\.?t\.?)', 'VALE_TRANSPORTE', 'desconto'),
('Vale Alimentação', '(?i)(vale.*aliment|v\.?a\.?)', 'VALE_ALIMENTACAO', 'desconto'),
('Vale Refeição', '(?i)(vale.*refei[çc][ãa]o|v\.?r\.?)', 'VALE_REFEICAO', 'desconto'),
('Plano de Saúde', '(?i)(plano.*sa[uú]de|assist.*m[eé]dica)', 'PLANO_SAUDE', 'desconto'),
('Seguro de Vida', '(?i)(seguro.*vida)', 'SEGURO_VIDA', 'desconto'),
('Empréstimo', '(?i)(empr[eé]stimo|desconto.*empr)', 'EMPRESTIMO', 'desconto'),
('Faltas', '(?i)(faltas?|desc.*faltas?)', 'FALTAS', 'desconto'),
('Atrasos', '(?i)(atrasos?|desc.*atrasos?)', 'ATRASOS', 'desconto')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. PERMISSÕES
-- =====================================================

-- Conceder permissões para usuários autenticados
GRANT SELECT, INSERT, UPDATE ON public.payroll_processing TO authenticated;
GRANT SELECT, INSERT ON public.processing_logs TO authenticated;
GRANT SELECT ON public.rubric_patterns TO authenticated;
GRANT SELECT ON public.extracted_rubrics TO authenticated;
GRANT SELECT, INSERT ON public.payroll_files_processing TO authenticated;

-- Conceder permissões para usuários anônimos (apenas leitura limitada)
GRANT SELECT ON public.rubric_patterns TO anon;

-- =====================================================
-- 11. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE public.payroll_processing IS 'Tabela principal para controle de processamento de holerites via IA';
COMMENT ON TABLE public.processing_logs IS 'Logs detalhados de cada processamento para auditoria e debugging';
COMMENT ON TABLE public.rubric_patterns IS 'Padrões de rubricas para mapeamento inteligente de dados extraídos';
COMMENT ON TABLE public.extracted_rubrics IS 'Rubricas extraídas dos PDFs durante o processamento';
COMMENT ON TABLE public.payroll_files_processing IS 'Relacionamento entre arquivos e processamentos (N:N)';

COMMENT ON COLUMN public.payroll_processing.competency IS 'Competência do processamento no formato MM/AAAA';
COMMENT ON COLUMN public.payroll_processing.progress IS 'Progresso do processamento de 0 a 100';
COMMENT ON COLUMN public.payroll_processing.webhook_response IS 'Resposta completa do webhook n8n para debugging';
COMMENT ON COLUMN public.processing_logs.log_level IS 'Nível do log: DEBUG, INFO, WARN, ERROR';
COMMENT ON COLUMN public.rubric_patterns.pattern_regex IS 'Expressão regular para identificar a rubrica no texto';
COMMENT ON COLUMN public.extracted_rubrics.confidence_score IS 'Score de confiança da extração (0.0 a 1.0)';