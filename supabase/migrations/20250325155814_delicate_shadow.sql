/*
  # Final RLS policy update for full access

  This migration updates the RLS policies to ensure all authenticated users
  have complete access to all operations while maintaining basic privacy controls.

  1. Changes
    - Drop existing policies
    - Create new unified policies with unique names
    - Maintain basic privacy controls
    
  2. Security
    - Any authenticated user can perform any operation
    - Private items still require authentication to view
    - Public items remain publicly viewable
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "folders_select_policy" ON folders;
DROP POLICY IF EXISTS "folders_all_operations" ON folders;
DROP POLICY IF EXISTS "files_select_policy" ON files;
DROP POLICY IF EXISTS "files_all_operations" ON files;

-- Simple, unified policies for folders with unique names
CREATE POLICY "folders_public_select_20250325155700" 
ON folders FOR SELECT 
TO public 
USING ((NOT is_private) OR (auth.uid() IS NOT NULL));

CREATE POLICY "folders_auth_all_20250325155700" 
ON folders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Simple, unified policies for files with unique names
CREATE POLICY "files_public_select_20250325155700" 
ON files FOR SELECT 
TO public 
USING ((NOT is_private) OR (auth.uid() IS NOT NULL));

CREATE POLICY "files_auth_all_20250325155700" 
ON files FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;