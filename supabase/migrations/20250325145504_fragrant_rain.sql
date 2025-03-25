/*
  # Atualizar políticas de acesso para arquivos e pastas

  1. Alterações
    - Adicionar coluna is_private para folders
    - Modificar políticas de SELECT para permitir acesso público a itens não privados
    - Manter restrição de acesso para itens privados apenas ao proprietário
    
  2. Segurança
    - Manter RLS ativado em todas as tabelas
    - Atualizar políticas para novo modelo de visibilidade
*/

-- Adicionar coluna is_private para a tabela folders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'folders' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE folders ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

-- Remover políticas antigas de SELECT
DROP POLICY IF EXISTS "Users can view their own folders" ON folders;
DROP POLICY IF EXISTS "Users can view their own files" ON files;

-- Criar novas políticas para pastas
CREATE POLICY "Public folders are visible to all" ON folders
  FOR SELECT
  USING (
    (COALESCE(is_private, false) = false) OR -- Pastas não privadas são visíveis para todos
    (auth.uid() = user_id) -- Pastas privadas só são visíveis para o proprietário
  );

-- Criar novas políticas para arquivos
CREATE POLICY "Public files are visible to all" ON files
  FOR SELECT
  USING (
    (COALESCE(is_private, false) = false) OR -- Arquivos não privados são visíveis para todos
    (auth.uid() = user_id) -- Arquivos privados só são visíveis para o proprietário
  );

-- Garantir que as políticas de modificação continuem restritas ao proprietário
DROP POLICY IF EXISTS "Users can update their own folders" ON folders;
CREATE POLICY "Users can update their own folders"
  ON folders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own folders" ON folders;
CREATE POLICY "Users can delete their own folders"
  ON folders
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own files" ON files;
CREATE POLICY "Users can update their own files"
  ON files
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own files" ON files;
CREATE POLICY "Users can delete their own files"
  ON files
  FOR DELETE
  USING (auth.uid() = user_id);