-- Migration: Ultimate fix for PGRST202 error and log_auth_event function
-- Date: 2025-11-02 18:30:00
-- Description: Comprehensive solution to eliminate PGRST202 errors and null constraint violations

-- ============================================================================
-- STEP 1: AGGRESSIVE CLEANUP OF EXISTING FUNCTIONS
-- ============================================================================

-- Drop all possible variations of the function
DROP FUNCTION IF EXISTS public.log_auth_event(uuid, text, jsonb, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(text, text, jsonb, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_auth_event CASCADE;

-- Force multiple cache reloads
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);

-- ============================================================================
-- STEP 2: VERIFY AND FIX AUDIT_LOGS TABLE STRUCTURE
-- ============================================================================

-- Ensure audit_logs table exists with proper structure
DO $$
BEGIN
    -- Check if audit_logs table exists, create if not
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        CREATE TABLE public.audit_logs (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
            event_type text NOT NULL,
            event_data jsonb DEFAULT '{}'::jsonb,
            ip_address text,
            user_agent text,
            created_at timestamptz DEFAULT NOW()
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
        
        RAISE NOTICE 'Created audit_logs table with proper structure';
    ELSE
        -- Ensure event_type column has NOT NULL constraint
        ALTER TABLE public.audit_logs ALTER COLUMN event_type SET NOT NULL;
        
        -- Ensure event_data has proper default
        ALTER TABLE public.audit_logs ALTER COLUMN event_data SET DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Updated audit_logs table constraints';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: CREATE THE LOG_AUTH_EVENT FUNCTION WITH BULLETPROOF VALIDATION
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
SET search_path = public
AS $$
DECLARE
    log_id uuid;
    validated_event_type text;
    validated_event_data jsonb;
BEGIN
    -- CRITICAL VALIDATION: event_type cannot be null or empty
    IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
        RAISE EXCEPTION 'event_type parameter is required and cannot be null or empty. Received: %', 
            COALESCE(p_event_type, 'NULL');
    END IF;
    
    -- Sanitize and validate event_type
    validated_event_type := trim(p_event_type);
    
    -- Validate event_data
    validated_event_data := COALESCE(p_event_data, '{}'::jsonb);
    
    -- Ensure event_data is valid JSON
    IF validated_event_data IS NULL THEN
        validated_event_data := '{}'::jsonb;
    END IF;
    
    -- Insert into audit_logs with explicit validation
    INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        p_user_id,
        validated_event_type,  -- Guaranteed to be NOT NULL
        validated_event_data,  -- Guaranteed to be valid jsonb
        CASE 
            WHEN p_ip_address IS NOT NULL THEN p_ip_address::inet
            ELSE NULL
        END,
        p_user_agent,
        NOW()
    ) RETURNING id INTO log_id;
    
    -- Verify the insert was successful
    IF log_id IS NULL THEN
        RAISE EXCEPTION 'Failed to insert audit log entry';
    END IF;
    
    RETURN log_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error details for debugging
        RAISE EXCEPTION 'log_auth_event failed: % (SQLSTATE: %) - Parameters: user_id=%, event_type=%, event_data=%', 
            SQLERRM, SQLSTATE, p_user_id, p_event_type, p_event_data;
END;
$$;

-- ============================================================================
-- STEP 4: GRANT COMPREHENSIVE PERMISSIONS
-- ============================================================================

-- Grant execute permissions to all relevant roles
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) TO postgres;

-- Grant table permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO anon;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.audit_logs TO postgres;

-- ============================================================================
-- STEP 5: FORCE MULTIPLE CACHE RELOADS
-- ============================================================================

-- Multiple cache reload attempts with delays
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload config';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);

-- ============================================================================
-- STEP 6: COMPREHENSIVE FUNCTION TESTING
-- ============================================================================

DO $$
DECLARE
    test_result_1 uuid;
    test_result_2 uuid;
    test_result_3 uuid;
    test_count integer;
BEGIN
    RAISE NOTICE 'Starting comprehensive function tests...';
    
    -- Test 1: Basic functionality with all parameters
    SELECT public.log_auth_event(
        NULL,  -- Use NULL instead of random UUID to avoid foreign key constraint
        'test_event_full',
        '{"test": true, "timestamp": "2025-11-02T18:30:00Z"}'::jsonb,
        '127.0.0.1',
        'Test User Agent'
    ) INTO test_result_1;
    
    IF test_result_1 IS NULL THEN
        RAISE EXCEPTION 'Test 1 FAILED: Function returned NULL with full parameters';
    END IF;
    RAISE NOTICE 'Test 1 PASSED: Full parameters - returned %', test_result_1;
    
    -- Test 2: Minimal parameters (only event_type)
    SELECT public.log_auth_event(
        NULL,
        'test_event_minimal',
        NULL,
        NULL,
        NULL
    ) INTO test_result_2;
    
    IF test_result_2 IS NULL THEN
        RAISE EXCEPTION 'Test 2 FAILED: Function returned NULL with minimal parameters';
    END IF;
    RAISE NOTICE 'Test 2 PASSED: Minimal parameters - returned %', test_result_2;
    
    -- Test 3: Default parameters
    SELECT public.log_auth_event(
        p_event_type => 'test_event_default'
    ) INTO test_result_3;
    
    IF test_result_3 IS NULL THEN
        RAISE EXCEPTION 'Test 3 FAILED: Function returned NULL with default parameters';
    END IF;
    RAISE NOTICE 'Test 3 PASSED: Default parameters - returned %', test_result_3;
    
    -- Test 4: Verify records were actually inserted
    SELECT COUNT(*) FROM public.audit_logs 
    WHERE event_type IN ('test_event_full', 'test_event_minimal', 'test_event_default')
    INTO test_count;
    
    IF test_count != 3 THEN
        RAISE EXCEPTION 'Test 4 FAILED: Expected 3 test records, found %', test_count;
    END IF;
    RAISE NOTICE 'Test 4 PASSED: All % test records found in database', test_count;
    
    -- Test 5: Error handling - null event_type should fail
    BEGIN
        SELECT public.log_auth_event(
            NULL,
            NULL,  -- This should cause an error
            NULL,
            NULL,
            NULL
        ) INTO test_result_1;
        
        RAISE EXCEPTION 'Test 5 FAILED: Function should have failed with NULL event_type';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%event_type parameter is required%' THEN
                RAISE NOTICE 'Test 5 PASSED: Properly rejected NULL event_type';
            ELSE
                RAISE EXCEPTION 'Test 5 FAILED: Wrong error message: %', SQLERRM;
            END IF;
    END;
    
    -- Clean up test records
    DELETE FROM public.audit_logs 
    WHERE event_type IN ('test_event_full', 'test_event_minimal', 'test_event_default');
    
    RAISE NOTICE 'ALL TESTS PASSED: log_auth_event function is working correctly!';
END $$;

-- ============================================================================
-- STEP 7: FINAL CACHE RELOAD AND VERIFICATION
-- ============================================================================

-- Final cache reload
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);

-- Add function comment for tracking
COMMENT ON FUNCTION public.log_auth_event(uuid, text, jsonb, text, text) IS 
'Ultimate fix for PGRST202 error - Created 2025-11-02 18:30:00. 
Includes comprehensive validation, error handling, and bulletproof parameter checking.
All tests passed successfully.';

-- Verify function exists and is accessible
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'log_auth_event'
        AND routine_type = 'FUNCTION'
    ) THEN
        RAISE EXCEPTION 'CRITICAL ERROR: log_auth_event function was not created successfully';
    END IF;
    
    RAISE NOTICE 'SUCCESS: log_auth_event function is properly registered in the schema';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '
================================================================================
MIGRATION COMPLETED SUCCESSFULLY!
================================================================================
✅ Dropped all existing function variations
✅ Verified and fixed audit_logs table structure  
✅ Created bulletproof log_auth_event function with validation
✅ Granted all necessary permissions
✅ Performed multiple cache reloads
✅ Passed all comprehensive tests
✅ Function is ready for production use

The PGRST202 error should now be completely resolved.
================================================================================
';
END $$;