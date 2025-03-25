/*
  # Update RLS policies for private items

  1. Changes
    - Update SELECT policies to only allow owners to view private items
    - Keep public items visible to all authenticated users
    - Maintain existing ALL operations policies for authenticated users

  2. Security
    - Private items can only be viewed by their owners
    - Public items remain visible to all authenticated users
    - Authenticated users can still perform all operations on items they can see
*/

-- Drop existing policies
DROP POLICY IF EXISTS "folders_public_select_20250325155700" ON folders;
DROP POLICY IF EXISTS "folders_auth_all_20250325155700" ON folders;
DROP POLICY IF EXISTS "files_public_select_20250325155700" ON files;
DROP POLICY IF EXISTS "files_auth_all_20250325155700" ON files;

-- Folders policies
CREATE POLICY "folders_select_policy" 
ON folders FOR SELECT 
TO public 
USING (
  (NOT is_private) OR -- Public folders visible to all
  (auth.uid() = owner_id) -- Private folders only visible to owner
);

CREATE POLICY "folders_all_operations" 
ON folders FOR ALL 
TO authenticated 
USING (
  (NOT is_private) OR -- Can operate on public folders
  (auth.uid() = owner_id) -- Or private folders they own
) 
WITH CHECK (true);

-- Files policies
CREATE POLICY "files_select_policy" 
ON files FOR SELECT 
TO public 
USING (
  (NOT is_private) OR -- Public files visible to all
  (auth.uid() = owner_id) -- Private files only visible to owner
);

CREATE POLICY "files_all_operations" 
ON files FOR ALL 
TO authenticated 
USING (
  (NOT is_private) OR -- Can operate on public files
  (auth.uid() = owner_id) -- Or private files they own
) 
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;