/*
  # Add match mode and optimize schema for future real matches

  1. Changes to matches table
    - Add `match_mode` column to distinguish between 'fictif' and 'real' matches
    - Add `external_api_id` column for future API integration
    - Add `api_provider` column to track which API provided the match data
    
  2. Changes to bets table
    - Ensure proper indexing for fast queries
    
  3. Future-ready structure
    - The system can easily switch between fictif and real modes
    - External API IDs can be stored for real match tracking
    - All columns are nullable to support both modes
*/

DO $$ 
BEGIN
  -- Add match_mode column to matches
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'match_mode'
  ) THEN
    ALTER TABLE matches ADD COLUMN match_mode text DEFAULT 'fictif' CHECK (match_mode IN ('fictif', 'real'));
  END IF;

  -- Add external_api_id for future real match integration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'external_api_id'
  ) THEN
    ALTER TABLE matches ADD COLUMN external_api_id text;
  END IF;

  -- Add api_provider column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'api_provider'
  ) THEN
    ALTER TABLE matches ADD COLUMN api_provider text;
  END IF;

  -- Create index on match_mode for fast filtering
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'matches' AND indexname = 'idx_matches_mode_status'
  ) THEN
    CREATE INDEX idx_matches_mode_status ON matches(match_mode, status);
  END IF;

  -- Create index on bets for fast user queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'bets' AND indexname = 'idx_bets_user_status'
  ) THEN
    CREATE INDEX idx_bets_user_status ON bets(user_id, is_win);
  END IF;

END $$;
