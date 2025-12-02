/*
  # Add Tutorial Tracking to Profiles

  1. Changes
    - Add `has_seen_tutorial` column to `profiles` table
      - Type: boolean
      - Default: false
      - Not null
    
  2. Purpose
    - Track whether a user has completed the first-time tutorial
    - Ensure tutorial is shown only once per user
    - Default value false ensures new users see the tutorial
  
  3. Security
    - No RLS changes needed (uses existing policies)
*/

-- Add has_seen_tutorial column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_seen_tutorial'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_seen_tutorial boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for faster queries on tutorial status
CREATE INDEX IF NOT EXISTS idx_profiles_tutorial 
ON profiles(has_seen_tutorial) 
WHERE has_seen_tutorial = false;