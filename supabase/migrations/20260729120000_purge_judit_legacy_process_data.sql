-- Remove os registros de processos herdados da integração Judit, mantendo
-- apenas o que veio da API Pública do DataJud/CNJ.
--
-- Discriminador: o edge function `datajud-search` grava sempre
-- search_type ∈ ('numeroProcesso','advanced'); a integração Judit gravava
-- ('lawsuit_cnj','cpf','oab').
--
-- Baseline em 29/07/2026 antes da limpeza:
--   process_query_requests  12  ->   4
--   process_snapshots      455  ->  22
--   process_agent_summaries  8  ->   3
--   process_user_state       4  ->   0
-- As tabelas de backup abaixo são rede de segurança e devem ser removidas
-- em migration futura assim que a limpeza for validada em produção.

-- 1. Backup ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._backup_judit_query_requests_20260729 AS
SELECT * FROM public.process_query_requests
 WHERE search_type NOT IN ('numeroProcesso', 'advanced');

CREATE TABLE IF NOT EXISTS public._backup_judit_snapshots_20260729 AS
SELECT * FROM public.process_snapshots
 WHERE last_request_id IN (
   SELECT id FROM public.process_query_requests
    WHERE search_type NOT IN ('numeroProcesso', 'advanced')
 );

-- Sem RLS e sem grants: tabelas técnicas, acessíveis apenas por service role.
ALTER TABLE public._backup_judit_query_requests_20260729 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_judit_snapshots_20260729 ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza -----------------------------------------------------------------
-- process_request_results cai por ON DELETE CASCADE de process_query_requests.
DELETE FROM public.process_query_requests
 WHERE search_type NOT IN ('numeroProcesso', 'advanced');

-- process_user_state e process_agent_summaries caem por ON DELETE CASCADE
-- de process_snapshots.
DELETE FROM public.process_snapshots
 WHERE last_request_id IS NULL
    OR last_request_id NOT IN (SELECT id FROM public.process_query_requests);

-- 3. Normalização de source_kind ---------------------------------------------
-- O CHECK legado não previa 'advanced', então mappers.ts remapeava
-- 'advanced' -> 'history'. Passamos a aceitar o valor correto.
ALTER TABLE public.process_snapshots
  DROP CONSTRAINT IF EXISTS process_snapshots_source_kind_check;

UPDATE public.process_snapshots
   SET source_kind = 'advanced'
 WHERE source_kind = 'history';

ALTER TABLE public.process_snapshots
  ADD CONSTRAINT process_snapshots_source_kind_check
  CHECK (source_kind IN ('query', 'advanced', 'detail', 'history', 'monitoring'));

-- 4. Status das consultas ----------------------------------------------------
-- Consultas antigas ficaram presas em 'pending' porque o edge function nunca
-- gravava o desfecho. A partir de agora só existem 'completed' e 'error'.
UPDATE public.process_query_requests
   SET status = 'error',
       error_message = COALESCE(error_message, 'Consulta interrompida (registro legado).')
 WHERE status = 'pending'
   AND finished_at IS NULL;

COMMENT ON COLUMN public.process_query_requests.status IS
  'completed | error — desfecho da chamada à API do DataJud/CNJ.';
COMMENT ON COLUMN public.process_query_requests.started_at IS
  'Instante imediatamente anterior ao fetch ao DataJud. Base do tempo de resposta.';
COMMENT ON COLUMN public.process_query_requests.finished_at IS
  'Instante do retorno do DataJud. finished_at - started_at = tempo de resposta.';
