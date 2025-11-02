-- Migration: Fix PGRST202 error for log_auth_event function
-- Date: 2025-11-02 17:30:00
-- Description: Simple and direct fix for the PGRST202 error

-- Step 1: Drop existing function if it exists
DROP FUNCTION IF EXISTS public.log_auth_event(uuid, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.log_auth_event(text, text, jsonb, text, text);

-- Step 2: Create the log_auth_event function with correct signature
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id uuid DEFAULT NULL,
  p_event_type text,
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
  -- Validate required parameters
  IF p_event_type IS NULL OR p_event_type = '' THEN
    RAISE EXCEPTION 'event_type cannot be null or empty';
  END IF;

  -- Insert into audit_logs table
  INSERT INTO public.audit_logs (
    user_id,
    event_type,
    event_data,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_user_id,
    p_event_type,
    COALESCE(p_event_data, '{}'::jsonb),
    p_ip_address,
    p_user_agent,
    NOW()
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- Step 3: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO service_role;

-- Step 4: Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Step 5: Test the function
DO $$
DECLARE
  test_result uuid;
BEGIN
  -- Test with minimal parameters
  SELECT public.log_auth_event(
    NULL,
    'test_event',
    '{"test": true}'::jsonb,
    NULL,
    NULL
  ) INTO test_result;
  
  IF test_result IS NULL THEN
    RAISE EXCEPTION 'Function test failed - returned NULL';
  END IF;
  
  RAISE NOTICE 'Function test successful - returned: %', test_result;
END;
$$;

-- Step 6: Comment for tracking
COMMENT ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) IS 
'Logs authentication events to audit_logs table. Fixed PGRST202 error on 2025-11-02 17:30:00';