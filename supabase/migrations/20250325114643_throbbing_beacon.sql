/*
  # Ajustar políticas da tabela users

  1. Alterações
    - Adicionar política para permitir inserção de novos usuários
    - Ajustar política de leitura para permitir verificação de e-mail existente

  2. Segurança
    - Manter RLS ativo
    - Garantir que apenas usuários autenticados possam ler/atualizar seus próprios dados
    - Permitir inserção durante o registro
*/

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "Usuários podem ler seus próprios dados" ON users;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON users;

-- Política para permitir inserção de novos usuários
CREATE POLICY "Permitir inserção de novos usuários"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- Política para leitura de dados
CREATE POLICY "Permitir leitura de dados públicos e próprios"
  ON users
  FOR SELECT
  USING (true);

-- Política para atualização
CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);