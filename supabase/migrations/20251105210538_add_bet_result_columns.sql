/*
  # Add result tracking columns to bets table

  1. Changes
    - Add `tokens_won` column to store actual tokens won (0 if lost)
    - Add `diamonds_won` column to store actual diamonds won (0 if lost)
    - These columns are filled when the match result is processed
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bets' AND column_name = 'tokens_won'
  ) THEN
    ALTER TABLE bets ADD COLUMN tokens_won integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bets' AND column_name = 'diamonds_won'
  ) THEN
    ALTER TABLE bets ADD COLUMN diamonds_won integer;
  END IF;
END $$;
