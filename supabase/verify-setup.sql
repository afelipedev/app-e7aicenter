-- Script de Verificação da Configuração do Supabase
-- Execute este script no SQL Editor do Supabase para verificar se tudo foi configurado corretamente

-- =====================================================
-- VERIFICAÇÃO DAS TABELAS
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'companies', 'payslips')
ORDER BY tablename;

-- =====================================================
-- VERIFICAÇÃO DO ROW LEVEL SECURITY
-- =====================================================

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'companies', 'payslips')
ORDER BY tablename;

-- =====================================================
-- VERIFICAÇÃO DAS POLÍTICAS RLS
-- =====================================================

-- Listar todas as políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- VERIFICAÇÃO DOS DADOS
-- =====================================================

-- Contar registros nas tabelas
SELECT 'companies' as tabela, COUNT(*) as total FROM public.companies
UNION ALL
SELECT 'users' as tabela, COUNT(*) as total FROM public.users
UNION ALL
SELECT 'payslips' as tabela, COUNT(*) as total FROM public.payslips;

-- Verificar dados das empresas
SELECT 
    name,
    cnpj,
    status,
    payslips_count,
    created_at
FROM public.companies
ORDER BY name;

-- Verificar contagem de holerites por empresa
SELECT 
    c.name as empresa,
    c.payslips_count as contagem_tabela,
    COUNT(p.id) as contagem_real
FROM public.companies c
LEFT JOIN public.payslips p ON c.id = p.company_id
GROUP BY c.id, c.name, c.payslips_count
ORDER BY c.name;

-- =====================================================
-- VERIFICAÇÃO DAS PERMISSÕES
-- =====================================================

-- Verificar permissões das tabelas
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND grantee IN ('anon', 'authenticated')
AND table_name IN ('users', 'companies', 'payslips')
ORDER BY table_name, grantee, privilege_type;

-- =====================================================
-- VERIFICAÇÃO DOS TRIGGERS
-- =====================================================

-- Listar triggers criados
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
AND event_object_table IN ('users', 'companies', 'payslips')
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- VERIFICAÇÃO DOS ÍNDICES
-- =====================================================

-- Listar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('users', 'companies', 'payslips')
ORDER BY tablename, indexname;

-- =====================================================
-- TESTE DE FUNCIONALIDADE
-- =====================================================

-- Testar inserção de holerite (deve atualizar contagem automaticamente)
-- DESCOMENTE AS LINHAS ABAIXO PARA TESTAR:

/*
-- Inserir um holerite de teste
INSERT INTO public.payslips (company_id, employee_name, amount, period)
SELECT 
    id,
    'Funcionário Teste',
    3500.00,
    CURRENT_DATE
FROM public.companies 
LIMIT 1;

-- Verificar se a contagem foi atualizada
SELECT 
    name,
    payslips_count
FROM public.companies
ORDER BY updated_at DESC
LIMIT 1;

-- Remover o holerite de teste
DELETE FROM public.payslips 
WHERE employee_name = 'Funcionário Teste';
*/