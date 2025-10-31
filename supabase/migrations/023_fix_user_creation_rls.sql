-- Corrigir políticas RLS para permitir criação de novos usuários
-- O problema é que usuários autenticados não conseguem se inserir na tabela users

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;

-- Política para SELECT: usuários autenticados podem ver todos os usuários
CREATE POLICY "Users can view all users" ON users
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Política para INSERT: usuários autenticados podem criar usuários
-- IMPORTANTE: Permite que usuários autenticados se insiram na tabela
CREATE POLICY "Users can insert users" ON users
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth_user_id = auth.uid()
    );

-- Política para UPDATE: usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update users" ON users
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL 
        AND auth_user_id = auth.uid()
    )
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth_user_id = auth.uid()
    );

-- Política para DELETE: apenas administradores podem deletar usuários
CREATE POLICY "Admins can delete users" ON users
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL 
        AND EXISTS (
            SELECT 1 FROM users u 
            WHERE u.auth_user_id = auth.uid() 
            AND u.role = 'administrator'
            AND u.status = 'ativo'
        )
    );

-- Garantir que RLS está habilitado
ALTER TABLE users ENABLE ROW LEVEL SECURITY;