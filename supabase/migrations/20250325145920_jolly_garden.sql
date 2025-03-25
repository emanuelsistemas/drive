/*
  # Update policies for public access

  1. Changes
    - Update policies to allow public access to non-private files and folders
    - Ensure private items are only visible to their owners
    - Maintain owner-only restrictions for modifications

  2. Security
    - Enable public read access to non-private items
    - Maintain strict control over private items
    - Preserve owner-only update/delete permissions
*/

-- Remover políticas antigas
DROP POLICY IF EXISTS "Public folders are visible to all" ON folders;
DROP POLICY IF EXISTS "Public files are visible to all" ON files;

-- Criar novas políticas para pastas
CREATE POLICY "Public folders are visible to all" ON folders
  FOR SELECT
  USING (
    (COALESCE(is_private, false) = false) OR
    (auth.uid() = user_id)
  );

-- Criar novas políticas para arquivos
CREATE POLICY "Public files are visible to all" ON files
  FOR SELECT
  USING (
    (COALESCE(is_private, false) = false) OR
    (auth.uid() = user_id)
  );