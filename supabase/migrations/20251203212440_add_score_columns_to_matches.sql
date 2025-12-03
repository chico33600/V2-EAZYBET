/*
  # Add score columns to matches table

  1. New Columns
    - `score_home` (integer) - Score of team A
    - `score_away` (integer) - Score of team B

  2. Notes
    - These columns will store the final scores from The Odds API
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'score_home'
  ) THEN
    ALTER TABLE matches ADD COLUMN score_home integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'score_away'
  ) THEN
    ALTER TABLE matches ADD COLUMN score_away integer;
  END IF;
END $$;
