/*
  # Sistema de arquivos
  
  1. Novas Tabelas
    - `folders`
      - `id` (uuid, primary key)
      - `name` (text, nome da pasta)
      - `parent_id` (uuid, referência à pasta pai, null para root)
      - `user_id` (uuid, dono da pasta)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `files`
      - `id` (uuid, primary key)
      - `name` (text, nome do arquivo)
      - `folder_id` (uuid, pasta onde o arquivo está)
      - `user_id` (uuid, dono do arquivo)
      - `size` (bigint, tamanho em bytes)
      - `type` (text, tipo do arquivo)
      - `url` (text, URL do arquivo no storage)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for CRUD operations
*/

-- Create folders table
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES folders(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create files table
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  folder_id uuid REFERENCES folders(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  type text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Folders policies
CREATE POLICY "Users can create their own folders"
  ON folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own folders"
  ON folders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON folders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Files policies
CREATE POLICY "Users can create their own files"
  ON files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own files"
  ON files
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON files
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON files
  FOR DELETE
  USING (auth.uid() = user_id);