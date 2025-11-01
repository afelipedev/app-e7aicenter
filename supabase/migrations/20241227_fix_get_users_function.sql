-- Corrigir função get_users_requiring_first_access
-- A função estava tentando retornar colunas que não existem na tabela

-- Remover função existente e recriar com estrutura correta
DROP FUNCTION IF EXISTS public.get_users_requiring_first_access();

-- Recriar função com colunas corretas
CREATE OR REPLACE FUNCTION public.get_users_requiring_first_access()
RETURNS TABLE (
    user_id UUID,
    email CHARACTER VARYING,
    name CHARACTER VARYING,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        u.id AS user_id,
        u.email,
        u.name,
        u.created_at
    FROM public.users u
    WHERE 
        COALESCE(u.first_access_completed, FALSE) = FALSE
        AND u.status = 'ativo'
    ORDER BY u.created_at DESC;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para documentação
COMMENT ON FUNCTION public.get_users_requiring_first_access() IS 'Retorna usuários que ainda precisam completar o primeiro acesso';