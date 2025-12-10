-- Migration: 039_allow_agent_id_as_assistant_type
-- Description: Permite usar agentId dos agentes da biblioteca como assistant_type
-- Created: 2025-01-XX

-- Remover constraint CHECK do assistant_type na tabela chats
ALTER TABLE public.chats 
DROP CONSTRAINT IF EXISTS chats_assistant_type_check;

-- Aumentar tamanho do VARCHAR para acomodar agentIds mais longos
ALTER TABLE public.chats 
ALTER COLUMN assistant_type TYPE VARCHAR(255);

-- Remover constraint CHECK do assistant_type na tabela rag_documents
ALTER TABLE public.rag_documents 
DROP CONSTRAINT IF EXISTS rag_documents_assistant_type_check;

-- Aumentar tamanho do VARCHAR para acomodar agentIds mais longos
ALTER TABLE public.rag_documents 
ALTER COLUMN assistant_type TYPE VARCHAR(255);
