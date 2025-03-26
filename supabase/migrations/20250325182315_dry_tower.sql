/*
  # Adicionar controle de sessão de upload

  1. Alterações
    - Adicionar coluna upload_session para tabelas files e folders
    - Permitir rastreamento de uploads incompletos
    
  2. Segurança
    - Manter políticas existentes
    - Não afeta RLS
*/

-- Adicionar coluna upload_session para files
ALTER TABLE files
ADD COLUMN IF NOT EXISTS upload_session text;

-- Adicionar coluna upload_session para folders
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS upload_session text;

-- Criar índice para melhor performance em buscas por sessão
CREATE INDEX IF NOT EXISTS idx_files_upload_session ON files(upload_session);
CREATE INDEX IF NOT EXISTS idx_folders_upload_session ON folders(upload_session);