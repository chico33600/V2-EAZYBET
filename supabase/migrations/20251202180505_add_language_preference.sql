/*
  # Add Language Preference to User Profiles

  1. Changes
    - Add `preferred_language` column to profiles table
    - Default to 'fr' (French)
    - Supports 'fr' and 'en' values
  
  2. Notes
    - This allows users to save their language preference
    - The preference persists across sessions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_language text DEFAULT 'fr' CHECK (preferred_language IN ('fr', 'en'));
  END IF;
END $$;
