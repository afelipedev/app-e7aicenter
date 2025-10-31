-- Migration: 003_permissions_and_data
-- Description: Configuração de permissões básicas e dados iniciais
-- Created: 2024-12-26

-- =====================================================
-- PERMISSÕES BÁSICAS
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
-- FUNÇÃO PARA CRIAÇÃO AUTOMÁTICA DE USUÁRIOS
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
-- DADOS INICIAIS
-- =====================================================

-- Inserir empresas de exemplo
INSERT INTO public.companies (name, cnpj, status, payslips_count) VALUES
('Empresa Exemplo Ltda', '12.345.678/0001-90', 'ativo', 15),
('Consultoria ABC', '98.765.432/0001-10', 'ativo', 8),
('Escritório XYZ', '11.222.333/0001-44', 'inativo', 0),
('Advocacia Silva & Associados', '45.678.901/0001-23', 'ativo', 12),
('Contabilidade Premium', '78.901.234/0001-56', 'ativo', 6);

-- Inserir holerites de exemplo
INSERT INTO public.payslips (company_id, employee_name, amount, period) 
SELECT 
    c.id,
    'Funcionário ' || generate_series(1, c.payslips_count),
    (random() * 5000 + 2000)::decimal(10,2),
    CURRENT_DATE - (random() * 365)::integer
FROM public.companies c
WHERE c.payslips_count > 0;