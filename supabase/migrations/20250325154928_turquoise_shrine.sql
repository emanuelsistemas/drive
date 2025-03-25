/*
  # Update RLS policies for full access

  This migration updates the RLS policies to allow any authenticated user
  to have full access to files and folders, while maintaining privacy controls.

  1. Changes
    - Remove user-specific restrictions on UPDATE/DELETE operations
    - Allow any authenticated user to modify any file or folder
    - Maintain privacy settings for viewing items
    
  2. Security
    - Private items still require authentication to view
    - All modifications require authentication
    - Public items remain publicly viewable
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Access control for folders" ON folders;
DROP POLICY IF EXISTS "Access control for files" ON files;
DROP POLICY IF EXISTS "Authenticated users can create folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can create files" ON files;
DROP POLICY IF EXISTS "Authenticated users can update folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can update files" ON files;
DROP POLICY IF EXISTS "Authenticated users can delete folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON files;

-- Folders policies
CREATE POLICY "Access control for folders"
  ON folders
  FOR SELECT
  TO public
  USING (
    (COALESCE(is_private, false) = false) OR 
    (auth.uid() IS NOT NULL)
  );

CREATE POLICY "Authenticated users can create folders"
  ON folders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update folders"
  ON folders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete folders"
  ON folders
  FOR DELETE
  TO authenticated
  USING (true);

-- Files policies
CREATE POLICY "Access control for files"
  ON files
  FOR SELECT
  TO public
  USING (
    (COALESCE(is_private, false) = false) OR 
    (auth.uid() IS NOT NULL)
  );

CREATE POLICY "Authenticated users can create files"
  ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update files"
  ON files
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete files"
  ON files
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;