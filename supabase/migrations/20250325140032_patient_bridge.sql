/*
  # Add privacy column to folders and files tables

  1. Changes
    - Add is_private column to folders table
    - Add is_private column to files table
    - Set default value to false for both columns
*/

-- Add is_private column to folders table
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- Add is_private column to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;