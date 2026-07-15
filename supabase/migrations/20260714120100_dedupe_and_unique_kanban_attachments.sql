-- Remove anexos duplicados e impede que voltem a ocorrer.
--
-- Contexto: o caminho de compartilhar/duplicar card gravava cada anexo em dobro
-- (cópia explícita da edge function + trigger de sync), gerando ~1.814 registros
-- duplicados apontando para o mesmo arquivo físico no mesmo card.

-- 1) Limpeza: mantém a linha mais antiga de cada grupo idêntico.
--    A flag anti-sync (local à transação) impede que o trigger de DELETE apague
--    as cópias legítimas dos cards vinculados durante a limpeza.
DO $$
BEGIN
  PERFORM set_config('app.kanban_link_sync', 'true', true);

  DELETE FROM public.legal_kanban_attachments a
  USING (
    SELECT id,
           row_number() OVER (
             PARTITION BY card_id, attachment_type,
                          COALESCE(file_path, ''), COALESCE(url, ''), COALESCE(name, '')
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.legal_kanban_attachments
  ) dup
  WHERE a.id = dup.id AND dup.rn > 1;
END $$;

-- 2) Índices únicos parciais: no máximo um anexo por arquivo (file_path) e por
--    link (url) em cada card.
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_kanban_attachments_file
  ON public.legal_kanban_attachments (card_id, file_path)
  WHERE attachment_type = 'file' AND file_path IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_kanban_attachments_link
  ON public.legal_kanban_attachments (card_id, url)
  WHERE attachment_type = 'link' AND url IS NOT NULL;
