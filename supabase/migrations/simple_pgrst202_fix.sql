-- Simple PGRST202 Fix
-- Drop and recreate log_auth_event function

DROP FUNCTION IF EXISTS public.log_auth_event CASCADE;

CREATE OR REPLACE FUNCTION public.log_auth_event(
    p_user_id uuid DEFAULT NULL,
    p_event_type text DEFAULT NULL,
    p_event_data jsonb DEFAULT '{}'::jsonb,
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
BEGIN
    -- Validate event_type
    IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
        RAISE EXCEPTION 'event_type cannot be null or empty';
    END IF;
    
    -- Insert log entry
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        trim(p_event_type),
        COALESCE(p_event_data, '{}'::jsonb),
        p_ip_address,
        p_user_agent,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_auth_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event TO service_role;

-- Force cache reload
NOTIFY pgrst, 'reload schema';