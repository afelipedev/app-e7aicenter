-- Fix RLS policies for processing_logs table
-- This migration allows authenticated users to insert and select logs

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert processing logs" ON processing_logs;
DROP POLICY IF EXISTS "Users can view processing logs" ON processing_logs;

-- Create new policies that allow authenticated users to insert and view logs
CREATE POLICY "Users can insert processing logs" ON processing_logs
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Users can view processing logs" ON processing_logs
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Ensure RLS is enabled
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;