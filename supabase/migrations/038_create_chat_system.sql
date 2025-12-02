-- Migration: 038_create_chat_system
-- Description: Sistema completo de chats com RAG e suporte a múltiplos LLMs
-- Created: 2025-01-XX

-- =====================================================
-- 1. TABELA DE CHATS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assistant_type VARCHAR(50) NOT NULL CHECK (assistant_type IN ('chat-general', 'tax-law', 'civil-law', 'financial', 'accounting')),
    title VARCHAR(255) NOT NULL DEFAULT 'Nova conversa',
    llm_model VARCHAR(50) NOT NULL DEFAULT 'gpt-4' CHECK (llm_model IN ('gpt-4', 'gpt-4-turbo', 'gemini-2.5-flash', 'claude-sonnet-4.5')),
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABELA DE MENSAGENS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA DE DOCUMENTOS RAG (para implementação futura)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_type VARCHAR(50) NOT NULL CHECK (assistant_type IN ('chat-general', 'tax-law', 'civil-law', 'financial', 'accounting')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    -- embedding VECTOR(1536), -- Para busca semântica futura (requer extensão pgvector)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_assistant_type ON public.chats(assistant_type);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_is_favorite ON public.chats(is_favorite) WHERE is_favorite = true;

-- Índices para chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);

-- Índices para rag_documents
CREATE INDEX IF NOT EXISTS idx_rag_documents_assistant_type ON public.rag_documents(assistant_type);
CREATE INDEX IF NOT EXISTS idx_rag_documents_created_at ON public.rag_documents(created_at DESC);

-- =====================================================
-- 5. TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_chats_updated_at 
    BEFORE UPDATE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rag_documents_updated_at 
    BEFORE UPDATE ON public.rag_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar updated_at do chat quando uma mensagem é adicionada
CREATE OR REPLACE FUNCTION update_chat_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chats 
    SET updated_at = NOW() 
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_on_message_insert
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_on_message();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para chats: usuários só podem ver/editar seus próprios chats
CREATE POLICY "Users can view their own chats" ON public.chats
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        user_id IN (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own chats" ON public.chats
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        user_id IN (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own chats" ON public.chats
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        user_id IN (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own chats" ON public.chats
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        user_id IN (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

-- Políticas para chat_messages: usuários só podem ver/editar mensagens de seus próprios chats
CREATE POLICY "Users can view messages of their chats" ON public.chat_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        chat_id IN (
            SELECT id FROM public.chats 
            WHERE user_id IN (
                SELECT id FROM public.users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert messages to their chats" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        chat_id IN (
            SELECT id FROM public.chats 
            WHERE user_id IN (
                SELECT id FROM public.users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update messages of their chats" ON public.chat_messages
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        chat_id IN (
            SELECT id FROM public.chats 
            WHERE user_id IN (
                SELECT id FROM public.users WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete messages of their chats" ON public.chat_messages
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        chat_id IN (
            SELECT id FROM public.chats 
            WHERE user_id IN (
                SELECT id FROM public.users WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Políticas para rag_documents: todos os usuários autenticados podem ver, apenas admins podem modificar
CREATE POLICY "All authenticated users can view rag documents" ON public.rag_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert rag documents" ON public.rag_documents
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

CREATE POLICY "Only admins can update rag documents" ON public.rag_documents
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

CREATE POLICY "Only admins can delete rag documents" ON public.rag_documents
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- =====================================================
-- 7. FUNÇÃO AUXILIAR PARA OBTER USER_ID
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE auth_user_id = auth.uid();
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
