/*
  # Add is_private column to files table

  1. Changes
    - Add `is_private` boolean column to `files` table with default value of false
    
  2. Security
    - No changes to RLS policies needed as existing policies already handle access control
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE files ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;