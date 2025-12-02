/*
  # Add tokens_staked column to bets table
  
  This migration adds a tokens_staked column to track token bets separately
  from diamond bets, ensuring proper accounting for both bet types.
  
  ## Changes
  - Add tokens_staked column (integer, default 0, must be >= 0)
  - Add tokens_rewarded column (integer, nullable)
*/

-- Add tokens_staked column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bets' AND column_name = 'tokens_staked'
  ) THEN
    ALTER TABLE bets ADD COLUMN tokens_staked integer DEFAULT 0 CHECK (tokens_staked >= 0);
  END IF;
END $$;

-- Add tokens_rewarded column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bets' AND column_name = 'tokens_rewarded'
  ) THEN
    ALTER TABLE bets ADD COLUMN tokens_rewarded integer DEFAULT 0;
  END IF;
END $$;
