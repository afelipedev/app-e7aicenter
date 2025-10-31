-- =====================================================
-- CONFIGURAÇÃO COMPLETA DO BANCO SUPABASE
-- E7AI Center App - Sistema de Autenticação e Autorização
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO AUXILIAR PARA ATUALIZAR TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 2. CRIAÇÃO DAS TABELAS
-- =====================================================

-- Tabela de Empresas (deve ser criada primeiro devido às foreign keys)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    payslips_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Usuários (ligada ao auth.users do Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('administrador', 'ti', 'advogado_adm', 'advogado', 'contabil', 'financeiro')),
    company_id UUID REFERENCES public.companies(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Holerites
CREATE TABLE public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para tabela users
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_company_id ON public.users(company_id);

-- Índices para tabela companies
CREATE INDEX idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX idx_companies_status ON public.companies(status);

-- Índices para tabela payslips
CREATE INDEX idx_payslips_company_id ON public.payslips(company_id);
CREATE INDEX idx_payslips_period ON public.payslips(period);

-- =====================================================
-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar updated_at na tabela users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at na tabela companies
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. FUNÇÃO E TRIGGERS PARA CONTAGEM AUTOMÁTICA DE HOLERITES
-- =====================================================

-- Função para atualizar contador de holerites automaticamente
CREATE OR REPLACE FUNCTION update_company_payslips_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.companies 
        SET payslips_count = payslips_count + 1 
        WHERE id = NEW.company_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.companies 
        SET payslips_count = payslips_count - 1 
        WHERE id = OLD.company_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers para contagem automática
CREATE TRIGGER update_payslips_count_insert 
    AFTER INSERT ON public.payslips
    FOR EACH ROW EXECUTE FUNCTION update_company_payslips_count();

CREATE TRIGGER update_payslips_count_delete 
    AFTER DELETE ON public.payslips
    FOR EACH ROW EXECUTE FUNCTION update_company_payslips_count();

-- =====================================================
-- 6. HABILITAÇÃO DO ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS DE SEGURANÇA POR ROLE
-- =====================================================

-- POLÍTICAS PARA TABELA USERS
-- Usuários podem ver seus próprios dados
CREATE POLICY "Usuários podem ver próprios dados" ON public.users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Admins podem ver todos os usuários
CREATE POLICY "Admins podem ver todos os usuários" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem inserir usuários
CREATE POLICY "Admins podem inserir usuários" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem atualizar usuários
CREATE POLICY "Admins podem atualizar usuários" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem deletar usuários
CREATE POLICY "Admins podem deletar usuários" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- POLÍTICAS PARA TABELA COMPANIES
-- Usuários autenticados podem ver empresas
CREATE POLICY "Usuários autenticados podem ver empresas" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins e Contábil podem inserir empresas
CREATE POLICY "Admins e Contábil podem inserir empresas" ON public.companies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm', 'contabil')
        )
    );

-- Admins podem atualizar empresas
CREATE POLICY "Admins podem atualizar empresas" ON public.companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem deletar empresas
CREATE POLICY "Admins podem deletar empresas" ON public.companies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- POLÍTICAS PARA TABELA PAYSLIPS
-- Usuários autenticados podem ver holerites
CREATE POLICY "Usuários autenticados podem ver holerites" ON public.payslips
    FOR SELECT USING (auth.role() = 'authenticated');

-- Usuários autenticados podem inserir holerites
CREATE POLICY "Usuários autenticados podem inserir holerites" ON public.payslips
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Usuários autenticados podem atualizar holerites
CREATE POLICY "Usuários autenticados podem atualizar holerites" ON public.payslips
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Usuários autenticados podem deletar holerites
CREATE POLICY "Usuários autenticados podem deletar holerites" ON public.payslips
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 8. PERMISSÕES BÁSICAS PARA ROLES ANON E AUTHENTICATED
-- =====================================================

-- Conceder uso do schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Permissões para tabela users
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;

-- Permissões para tabela companies
GRANT SELECT ON public.companies TO anon;
GRANT ALL ON public.companies TO authenticated;

-- Permissões para tabela payslips
GRANT SELECT ON public.payslips TO anon;
GRANT ALL ON public.payslips TO authenticated;

-- =====================================================
-- 9. DADOS INICIAIS DE EXEMPLO
-- =====================================================

-- Inserir empresas de exemplo
INSERT INTO public.companies (name, cnpj, status, payslips_count) VALUES
('Empresa Exemplo Ltda', '12.345.678/0001-90', 'ativo', 15),
('Consultoria ABC', '98.765.432/0001-10', 'ativo', 8),
('Escritório XYZ', '11.222.333/0001-44', 'inativo', 0),
('Advocacia Silva & Associados', '45.678.901/0001-23', 'ativo', 12),
('Contabilidade Premium', '78.901.234/0001-56', 'ativo', 6);

-- Inserir holerites de exemplo (baseado no payslips_count das empresas)
INSERT INTO public.payslips (company_id, employee_name, amount, period) 
SELECT 
    c.id,
    'Funcionário ' || generate_series(1, c.payslips_count),
    (random() * 5000 + 2000)::decimal(10,2),
    CURRENT_DATE - (random() * 365)::integer
FROM public.companies c
WHERE c.payslips_count > 0;

-- =====================================================
-- 10. FUNÇÃO PARA CRIAR USUÁRIO AUTOMATICAMENTE APÓS SIGNUP
-- =====================================================

-- Função para criar registro na tabela users quando um usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (auth_user_id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'advogado')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger para executar a função quando um novo usuário é criado
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 11. VERIFICAÇÃO E RELATÓRIO FINAL
-- =====================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'companies', 'payslips')
ORDER BY tablename;

-- Verificar políticas RLS criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar dados inseridos
SELECT 'companies' as tabela, count(*) as registros FROM public.companies
UNION ALL
SELECT 'payslips' as tabela, count(*) as registros FROM public.payslips;

-- =====================================================
-- CONFIGURAÇÃO CONCLUÍDA!
-- =====================================================
-- 
-- RESUMO DO QUE FOI CONFIGURADO:
-- ✅ Tabelas: users, companies, payslips
-- ✅ Ligação entre auth.users e public.users
-- ✅ 6 perfis de usuário: administrador, ti, advogado_adm, advogado, contabil, financeiro
-- ✅ Row Level Security (RLS) habilitado
-- ✅ Políticas de permissão por role
-- ✅ Contagem automática de holerites por empresa
-- ✅ Índices para performance
-- ✅ Triggers para atualização automática
-- ✅ Dados iniciais de exemplo
-- ✅ Permissões básicas configuradas
-- ✅ Função para criação automática de usuários
--
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Configure as variáveis de ambiente no projeto
-- 3. Teste a autenticação e autorização
-- =====================================================