/*
  # Add potential_win column to bets table

  1. Changes
    - Add `potential_win` column to bets table to store the total win amount (stake + profit)
    - This represents the total amount of tokens the user will receive if they win
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bets' AND column_name = 'potential_win'
  ) THEN
    ALTER TABLE bets ADD COLUMN potential_win integer NOT NULL DEFAULT 0;
  END IF;
END $$;
