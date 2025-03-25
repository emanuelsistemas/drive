/*
  # Update RLS policies for full access

  This migration updates the Row Level Security (RLS) policies to allow:
  - All authenticated users to perform any action on files and folders
  - Public users to view non-private items
  
  1. Changes
    - Drop existing restrictive policies
    - Create new permissive policies for authenticated users
    - Maintain public access for non-private items
    
  2. Security
    - Authenticated users can perform all operations
    - Public users can only view non-private items
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