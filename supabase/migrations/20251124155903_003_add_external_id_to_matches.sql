/*
  # Add external_id to matches table
  
  ## Changes
  
  1. Add external_id column to matches table
     - Used to track matches from external APIs (Odds API)
     - Prevents duplicate imports
     - Nullable for internally created matches
  
  2. Add unique index on external_id
     - Ensures no duplicate imports from external sources
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE matches ADD COLUMN external_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id) WHERE external_id IS NOT NULL;
