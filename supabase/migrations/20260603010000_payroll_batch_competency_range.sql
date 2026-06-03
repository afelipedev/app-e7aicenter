-- Suporte a competência de lote no processamento de holerites (MM/AAAA-MM/AAAA)

ALTER TABLE public.payroll_processing
  ALTER COLUMN competency TYPE VARCHAR(32);

COMMENT ON COLUMN public.payroll_processing.competency IS
  'Competência MM/AAAA ou intervalo de lote MM/AAAA-MM/AAAA';

CREATE OR REPLACE FUNCTION start_payroll_processing(
    p_file_ids UUID[],
    p_company_id UUID,
    p_competency VARCHAR(32)
) RETURNS UUID AS $$
DECLARE
    processing_id UUID;
    file_id UUID;
    competency_valid BOOLEAN;
BEGIN
    competency_valid :=
        p_competency ~ '^(0[1-9]|1[0-2])/[0-9]{4}$'
        OR p_competency ~ '^(0[1-9]|1[0-2])/[0-9]{4}-(0[1-9]|1[0-2])/[0-9]{4}$';

    IF NOT competency_valid THEN
        RAISE EXCEPTION 'Competência inválida. Use o formato MM/AAAA ou MM/AAAA-MM/AAAA para lote';
    END IF;

    INSERT INTO public.payroll_processing (company_id, competency, initiated_by)
    VALUES (p_company_id, p_competency, auth.uid())
    RETURNING id INTO processing_id;

    FOREACH file_id IN ARRAY p_file_ids
    LOOP
        INSERT INTO public.payroll_files_processing (payroll_file_id, processing_id)
        VALUES (file_id, processing_id);

        UPDATE public.payroll_files
        SET status = 'processing'
        WHERE id = file_id AND company_id = p_company_id;
    END LOOP;

    INSERT INTO public.processing_logs (processing_id, log_level, message, metadata)
    VALUES (
        processing_id,
        'INFO',
        'Processamento iniciado',
        jsonb_build_object(
            'file_count', array_length(p_file_ids, 1),
            'competency', p_competency
        )
    );

    RETURN processing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
