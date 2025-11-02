-- Migration: Final PGRST202 Solution
-- Date: 2025-11-02 19:50:00
-- Description: Bulletproof fix for PGRST202 errors and null constraint violations

-- ============================================================================
-- STEP 1: AGGRESSIVE CLEANUP
-- ============================================================================

DROP FUNCTION IF EXISTS public.log_auth_event CASCADE;
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);

-- ============================================================================
-- STEP 2: CREATE BULLETPROOF FUNCTION
-- ============================================================================

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
    -- CRITICAL: Validate event_type
    IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
        RAISE EXCEPTION 'event_type cannot be null or empty';
    END IF;
    
    -- Insert with guaranteed non-null event_type
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

-- ============================================================================
-- STEP 3: PERMISSIONS AND CACHE RELOAD
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.log_auth_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event TO service_role;

NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- STEP 4: TEST THE FUNCTION
-- ============================================================================

DO $$
DECLARE
    test_id uuid;
BEGIN
    SELECT public.log_auth_event(
        NULL,
        'migration_test',
        '{"test": true}'::jsonb
    ) INTO test_id;
    
    IF test_id IS NULL THEN
        RAISE EXCEPTION 'Function test failed';
    END IF;
    
    DELETE FROM public.audit_logs WHERE id = test_id;
    RAISE NOTICE 'Function test passed: %', test_id;
END $$;