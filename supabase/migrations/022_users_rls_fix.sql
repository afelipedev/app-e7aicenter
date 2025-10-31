-- Política RLS para permitir que usuários autenticados vejam todos os usuários
-- Isso é necessário para o sistema de administração de usuários

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;

-- Política para SELECT: usuários autenticados podem ver todos os usuários
CREATE POLICY "Users can view all users" ON users
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Política para INSERT: usuários autenticados podem criar usuários
CREATE POLICY "Users can insert users" ON users
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política para UPDATE: usuários autenticados podem atualizar usuários
CREATE POLICY "Users can update users" ON users
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política para DELETE: usuários autenticados podem deletar usuários
CREATE POLICY "Users can delete users" ON users
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Garantir que RLS está habilitado
ALTER TABLE users ENABLE ROW LEVEL SECURITY;