/*
  # Add password protection for private items

  1. Changes
    - Add owner_id column to track who locked the item
    - Add access_password column for private items
    - Update RLS policies to enforce access control
*/

-- Add columns for password protection
ALTER TABLE folders ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE folders ADD COLUMN IF NOT EXISTS access_password text;

ALTER TABLE files ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE files ADD COLUMN IF NOT EXISTS access_password text;

-- Update existing items to set owner_id
UPDATE folders SET owner_id = user_id WHERE owner_id IS NULL;
UPDATE files SET owner_id = user_id WHERE owner_id IS NULL;

-- Update RLS policies for folders
DROP POLICY IF EXISTS "Anyone can view public folders" ON folders;
DROP POLICY IF EXISTS "Authenticated users can view all folders" ON folders;

CREATE POLICY "Access control for folders"
  ON folders
  FOR SELECT
  TO public
  USING (
    COALESCE(is_private, false) = false OR 
    auth.uid() = owner_id
  );

-- Update RLS policies for files
DROP POLICY IF EXISTS "Anyone can view public files" ON files;
DROP POLICY IF EXISTS "Authenticated users can view all files" ON files;

CREATE POLICY "Access control for files"
  ON files
  FOR SELECT
  TO public
  USING (
    COALESCE(is_private, false) = false OR 
    auth.uid() = owner_id
  );