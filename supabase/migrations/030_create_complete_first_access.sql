-- Criar função complete_first_access que estava faltando
-- Esta função é chamada quando o usuário completa o primeiro acesso

-- Remover função se existir (para evitar conflitos)
DROP FUNCTION IF EXISTS public.complete_first_access(UUID);

-- Criar função complete_first_access
CREATE OR REPLACE FUNCTION public.complete_first_access(
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
    user_email TEXT;
BEGIN
    -- Verificar se o usuário existe e obter email
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id), 
           (SELECT email FROM public.users WHERE id = user_id LIMIT 1)
    INTO user_exists, user_email;
    
    -- Se usuário não existe, retornar false
    IF NOT user_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Atualizar usuário para marcar primeiro acesso como completo
    UPDATE public.users 
    SET 
        first_access_completed = TRUE,
        first_access_at = NOW()
    WHERE id = user_id;
    
    -- Registrar evento de auditoria
    PERFORM public.log_auth_event(
        user_id,
        'first_access_completed',
        jsonb_build_object(
            'completed_at', NOW(),
            'success', TRUE,
            'user_email', user_email
        ),
        NULL,
        NULL
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar comentário para documentação
COMMENT ON FUNCTION public.complete_first_access(UUID) IS 'Marca o primeiro acesso do usuário como completo e registra evento de auditoria';