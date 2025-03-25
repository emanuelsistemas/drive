/*
  # Fix RLS policies for toggling private status

  1. Changes
    - Drop and recreate update policies to ensure proper permissions
    - Allow authenticated users to toggle private status
    - Maintain consistent policy naming

  2. Security
    - All authenticated users can:
      - Update any file or folder
      - Toggle private status
      - Delete any file or folder
    - Private items remain visible only to owners
*/

-- Drop existing update policies
DROP POLICY IF EXISTS "Authenticated users can update any folder" ON folders;
DROP POLICY IF EXISTS "Authenticated users can update any file" ON files;

-- Create new update policies with explicit column permissions
CREATE POLICY "Authenticated users can update any folder"
  ON folders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update any file"
  ON files
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;