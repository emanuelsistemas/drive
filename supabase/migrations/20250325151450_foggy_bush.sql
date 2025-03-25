/*
  # Consolidate and fix RLS policies

  1. Changes
    - Drop all existing policies to avoid conflicts
    - Create new consolidated policies for all operations
    - Ensure proper permissions for all authenticated users

  2. Security
    - All authenticated users can:
      - View all files and folders (public or private)
      - Create new files and folders
      - Update any file or folder
      - Delete any file or folder
    - Public access is restricted to public (non-private) items only
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Public folders are visible to all" ON folders;
DROP POLICY IF EXISTS "Public files are visible to all" ON files;
DROP POLICY IF EXISTS "Authenticated users can update any folder" ON folders;
DROP POLICY IF EXISTS "Authenticated users can update any file" ON files;
DROP POLICY IF EXISTS "Authenticated users can delete any folder" ON folders;
DROP POLICY IF EXISTS "Authenticated users can delete any file" ON files;

-- Folders policies
CREATE POLICY "Anyone can view public folders"
  ON folders
  FOR SELECT
  TO public
  USING (COALESCE(is_private, false) = false);

CREATE POLICY "Authenticated users can view all folders"
  ON folders
  FOR SELECT
  TO authenticated
  USING (true);

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
CREATE POLICY "Anyone can view public files"
  ON files
  FOR SELECT
  TO public
  USING (COALESCE(is_private, false) = false);

CREATE POLICY "Authenticated users can view all files"
  ON files
  FOR SELECT
  TO authenticated
  USING (true);

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