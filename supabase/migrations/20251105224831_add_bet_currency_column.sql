/*
  # Add bet currency column to bets table

  1. Changes to bets table
    - Add `bet_currency` column to track if bet was placed with tokens or diamonds
    - Default to 'tokens' for backward compatibility
    
  2. Purpose
    - Track which currency was used for placing the bet
    - Apply different reward logic based on bet currency:
      * Token bets: win tokens + 1% diamonds bonus
      * Diamond bets: win only diamonds (no tokens)
*/

DO $$ 
BEGIN
  -- Add bet_currency column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bets' AND column_name = 'bet_currency'
  ) THEN
    ALTER TABLE bets ADD COLUMN bet_currency text DEFAULT 'tokens' CHECK (bet_currency IN ('tokens', 'diamonds'));
  END IF;

END $$;
