-- Migration para criar função RPC de atualização de processamento SPED
-- Similar à função receive_processing_result do payroll, mas para SPED

-- =====================================================
-- FUNÇÃO RPC: receive_sped_processing_result
-- =====================================================
-- Esta função atualiza tanto sped_processing quanto sped_files relacionados
-- quando o processamento é concluído ou há erro

CREATE OR REPLACE FUNCTION public.receive_sped_processing_result(
    p_processing_id UUID,
    p_status VARCHAR(20),
    p_progress INTEGER DEFAULT NULL,
    p_result_file_url TEXT DEFAULT NULL,
    p_extracted_data JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_webhook_response JSONB DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_s3_url TEXT;
    v_excel_url TEXT;
BEGIN
    -- Atualizar processamento
    UPDATE public.sped_processing 
    SET 
        status = p_status,
        progress = COALESCE(p_progress, CASE WHEN p_status = 'completed' THEN 100 ELSE progress END),
        result_file_url = p_result_file_url,
        extracted_data = p_extracted_data,
        error_message = p_error_message,
        webhook_response = p_webhook_response,
        completed_at = CASE WHEN p_status IN ('completed', 'error') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = p_processing_id;
    
    -- Atualizar status dos arquivos relacionados
    UPDATE public.sped_files 
    SET status = CASE 
        WHEN p_status = 'completed' THEN 'completed'
        WHEN p_status = 'error' THEN 'error'
        ELSE status
    END,
    processed_at = CASE 
        WHEN p_status = 'completed' THEN NOW()
        ELSE processed_at
    END
    WHERE id IN (
        SELECT sped_file_id 
        FROM public.sped_files_processing 
        WHERE processing_id = p_processing_id
    );
    
    -- Se o processamento foi concluído com sucesso, tentar extrair e atualizar URLs
    IF p_status = 'completed' THEN
        -- Tentar extrair s3_url de diferentes estruturas de resposta do n8n
        v_s3_url := COALESCE(
            (p_webhook_response->>'s3_url'),
            (p_webhook_response->'data'->>'s3_url'),
            (p_webhook_response->'data'->'arquivo'->'urls'->>'s3_url'),
            (p_webhook_response->'data'->'arquivos'->'s3'->>'url'),
            (p_extracted_data->>'s3_url'),
            (p_extracted_data->'arquivo'->'urls'->>'s3_url'),
            (p_extracted_data->'arquivos'->'s3'->>'url'),
            NULL
        );
        
        -- Usar p_result_file_url como excel_url ou tentar extrair de diferentes estruturas
        v_excel_url := COALESCE(
            p_result_file_url,
            (p_webhook_response->'data'->'arquivo'->'urls'->>'excel_download'),
            (p_webhook_response->'data'->'arquivos'->'excel'->>'url'),
            (p_webhook_response->'data'->>'excel_url'),
            (p_extracted_data->'arquivo'->'urls'->>'excel_download'),
            (p_extracted_data->'arquivos'->'excel'->>'url'),
            (p_extracted_data->>'excel_url'),
            NULL
        );
        
        -- Atualizar arquivos com URLs se disponíveis
        IF v_s3_url IS NOT NULL OR v_excel_url IS NOT NULL THEN
            UPDATE public.sped_files 
            SET 
                excel_url = COALESCE(v_excel_url, excel_url),
                s3_url = COALESCE(v_s3_url, s3_url),
                extracted_data = COALESCE(p_extracted_data, extracted_data)
            WHERE id IN (
                SELECT sped_file_id 
                FROM public.sped_files_processing 
                WHERE processing_id = p_processing_id
            );
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.receive_sped_processing_result TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_sped_processing_result TO anon;
