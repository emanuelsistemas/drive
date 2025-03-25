/*
  # Final RLS policy update for full access

  This migration updates the RLS policies to ensure all authenticated users
  have complete access to all operations while maintaining basic privacy controls.

  1. Changes
    - Simplify policies to grant full access to authenticated users
    - Remove all user-specific restrictions
    - Keep basic privacy controls for public/private items
    
  2. Security
    - Any authenticated user can perform any operation
    - Private items still require authentication to view
    - Public items remain publicly viewable
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Access control for folders" ON folders;
DROP POLICY IF EXISTS "Access control for files" ON files;
DROP POLICY IF EXISTS "Authenticated users can create folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can create files" ON files;
DROP POLICY IF EXISTS "Authenticated users can update folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can update files" ON files;
DROP POLICY IF EXISTS "Authenticated users can delete folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON files;

-- Simple, unified policies for folders
CREATE POLICY "folders_select_policy" 
ON folders FOR SELECT 
TO public 
USING ((NOT is_private) OR (auth.uid() IS NOT NULL));

CREATE POLICY "folders_all_operations" 
ON folders FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Simple, unified policies for files
CREATE POLICY "files_select_policy" 
ON files FOR SELECT 
TO public 
USING ((NOT is_private) OR (auth.uid() IS NOT NULL));

CREATE POLICY "files_all_operations" 
ON files FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;