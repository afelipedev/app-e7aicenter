-- Migration: 20260227_change_lead_type_fornecedor_to_parceiro
-- Description: Alterar tipo de lead "fornecedor" para "parceiro"
-- Created: 2026-02-27

-- 1. Remover constraint antiga (permite UPDATE temporariamente)
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_lead_type_check;

-- 2. Atualizar registros existentes
UPDATE public.leads SET lead_type = 'parceiro' WHERE lead_type = 'fornecedor';

-- 3. Adicionar nova constraint
ALTER TABLE public.leads ADD CONSTRAINT leads_lead_type_check CHECK (
  lead_type IS NULL OR lead_type IN ('cliente', 'parceiro')
);
