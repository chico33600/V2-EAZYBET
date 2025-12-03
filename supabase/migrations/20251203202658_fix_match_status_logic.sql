/*
  # Fix match status logic and add missing fields

  1. New Fields
    - Add `end_time` to matches (calculated as match_date + 2 hours)
    - Add `resolved_at` to bets table
    - Add `resolved_at` to combo_bets table
    - Add policy to allow anon to UPDATE matches (for status updates)

  2. Match Status Logic
    - upcoming: now < match_date
    - live: match_date <= now < end_time
    - finished: now >= end_time

  3. Notes
    - This fixes the core issue where match statuses weren't updating correctly
    - Allows resolve-bets to update match status properly
*/

-- Add end_time to matches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE matches ADD COLUMN end_time timestamptz;
  END IF;
END $$;

-- Update existing matches to set end_time = match_date + 2 hours
UPDATE matches
SET end_time = match_date + interval '2 hours'
WHERE end_time IS NULL;

-- Make end_time NOT NULL after setting values
ALTER TABLE matches ALTER COLUMN end_time SET NOT NULL;

-- Add resolved_at to bets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bets' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE bets ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

-- Add resolved_at to combo_bets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'combo_bets' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE combo_bets ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

-- Add policy to allow anon to update match status (for resolve-bets function)
DROP POLICY IF EXISTS "Allow anon to update matches for resolution" ON matches;

CREATE POLICY "Allow anon to update matches for resolution"
  ON matches
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index on end_time for performance
CREATE INDEX IF NOT EXISTS idx_matches_end_time ON matches(end_time);

-- Create function to automatically set end_time on new matches
CREATE OR REPLACE FUNCTION set_match_end_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NULL THEN
    NEW.end_time := NEW.match_date + interval '2 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set end_time automatically
DROP TRIGGER IF EXISTS set_match_end_time_trigger ON matches;
CREATE TRIGGER set_match_end_time_trigger
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION set_match_end_time();