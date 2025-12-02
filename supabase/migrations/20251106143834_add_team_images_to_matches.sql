/*
  # Add Team Images to Matches Table

  1. New Columns
    - `team_a_badge` (text, nullable) - Logo of home team
    - `team_a_banner` (text, nullable) - Banner image of home team
    - `team_a_stadium` (text, nullable) - Stadium image of home team
    - `team_b_badge` (text, nullable) - Logo of away team
    - `team_b_banner` (text, nullable) - Banner image of away team
    - `team_b_stadium` (text, nullable) - Stadium image of away team
  
  2. Purpose
    - Store team visual assets from TheSportsDB API
    - Enable rich UI with team logos and background images
    - Cache images to avoid repeated API calls
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_badge'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_badge TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_banner'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_banner TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_stadium'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_stadium TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_badge'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_badge TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_banner'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_banner TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_stadium'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_stadium TEXT;
  END IF;
END $$;