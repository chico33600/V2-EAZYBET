/*
  # Add Competition Field to Matches

  1. Changes
    - Rename `league` column to `competition` for better clarity
    - Update existing data to use the new column name
    
  2. Notes
    - This migration preserves existing data
    - The competition field will store values like "Ligue 1", "Champions League", etc.
*/

-- Rename league column to competition
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'league'
  ) THEN
    ALTER TABLE matches RENAME COLUMN league TO competition;
  END IF;
END $$;