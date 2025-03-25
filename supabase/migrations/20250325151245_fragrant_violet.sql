/*
  # Update RLS policies for shared access

  1. Changes
    - Remove user_id restrictions from update and delete policies
    - Allow all authenticated users to modify any file or folder
    - Maintain private/public visibility restrictions
    - Keep insert policies restricted to authenticated users

  2. Security
    - All authenticated users can now:
      - Update any file or folder
      - Delete any file or folder
      - View public items
      - View their own private items
    - Only owners can still view their private items
*/

-- Remove existing policies
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;
DROP POLICY IF EXISTS "Users can update their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Create new update policies for folders
CREATE POLICY "Authenticated users can update any folder"
  ON folders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new delete policies for folders
CREATE POLICY "Authenticated users can delete any folder"
  ON folders
  FOR DELETE
  TO authenticated
  USING (true);

-- Create new update policies for files
CREATE POLICY "Authenticated users can update any file"
  ON files
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new delete policies for files
CREATE POLICY "Authenticated users can delete any file"
  ON files
  FOR DELETE
  TO authenticated
  USING (true);