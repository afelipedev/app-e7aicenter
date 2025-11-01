-- Migração para adicionar campos de primeiro acesso e sistema de auditoria
-- Baseado na arquitetura técnica definida

-- 1. Adicionar campos para controle de primeiro acesso na tabela users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_access_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_access_at TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_first_access 
ON public.users(first_access_completed);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id 
ON public.users(auth_user_id);

-- 3. Atualizar usuários existentes para marcar primeiro acesso como concluído
-- (usuários já existentes não precisam passar pelo fluxo de primeiro acesso)
UPDATE public.users 
SET first_access_completed = TRUE, 
    first_access_at = created_at 
WHERE first_access_completed IS NULL OR first_access_completed = FALSE;

-- 4. Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices para performance da tabela de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 6. Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para audit_logs
-- Usuários podem ver seus próprios logs
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM public.users WHERE id = audit_logs.user_id
        )
    );

-- Administradores podem ver todos os logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'administrator'
            AND status = 'ativo'
        )
    );

-- Service role pode inserir logs (para auditoria automática)
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (
        -- Permite inserção via service role (auth.uid() IS NULL) ou usuários autenticados
        auth.uid() IS NULL OR auth.uid() IS NOT NULL
    );

-- 8. Comentários para documentação
COMMENT ON TABLE public.audit_logs IS 'Tabela para armazenar logs de auditoria do sistema de autenticação';
COMMENT ON COLUMN public.users.first_access_completed IS 'Indica se o usuário já completou o fluxo de primeiro acesso';
COMMENT ON COLUMN public.users.first_access_at IS 'Timestamp de quando o primeiro acesso foi completado';