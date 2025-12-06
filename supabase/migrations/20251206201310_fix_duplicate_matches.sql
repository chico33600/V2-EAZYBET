/*
  # Fix duplicate matches and prevent future duplicates

  1. Changes
    - Delete duplicate matches, keeping only the oldest entry for each external_api_id
    - Add UNIQUE constraint on external_api_id to prevent future duplicates
    - This will ensure each match from TheOddsAPI is only stored once

  2. Notes
    - Keeps the first created match for each external_api_id
    - Deletes all subsequent duplicates
    - The UNIQUE constraint will prevent the sync function from creating duplicates
*/

-- Step 1: Delete duplicate matches, keeping only the oldest one for each external_api_id
DELETE FROM matches
WHERE id NOT IN (
  SELECT DISTINCT ON (external_api_id) id
  FROM matches
  WHERE external_api_id IS NOT NULL
  ORDER BY external_api_id, created_at ASC
)
AND external_api_id IS NOT NULL;

-- Step 2: Add UNIQUE constraint on external_api_id to prevent future duplicates
ALTER TABLE matches
ADD CONSTRAINT matches_external_api_id_unique 
UNIQUE (external_api_id);

-- Log the cleanup results
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM matches;
  RAISE NOTICE 'Cleanup complete. Remaining matches: %', remaining_count;
END $$;
