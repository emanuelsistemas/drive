/*
  # Criar tabela de usuários

  1. Nova Tabela
    - `users`
      - `id` (uuid, chave primária) - ID do usuário do Supabase Auth
      - `username` (texto, não nulo) - Nome do usuário
      - `email` (texto, único, não nulo) - E-mail do usuário
      - `created_at` (timestamp com fuso horário) - Data de criação

  2. Segurança
    - Habilitar RLS na tabela users
    - Adicionar política para usuários autenticados lerem seus próprios dados
    - Adicionar política para usuários autenticados atualizarem seus próprios dados
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ler seus próprios dados"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);