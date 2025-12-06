/*
  # Fast automatic match resolution system

  1. Changes
    - Create function to automatically update match status and simulate results
    - Matches transition from upcoming -> in_progress -> finished
    - In-progress matches auto-finish after 30 seconds with random result
    - Create cron job that runs every minute

  2. Notes
    - Only affects matches in upcoming or in_progress status
    - Automatically generates random results for finished matches
    - Results are weighted based on odds for realism
*/

-- Function to automatically progress matches and simulate results
CREATE OR REPLACE FUNCTION auto_progress_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  random_result TEXT;
  random_val FLOAT;
  total_weight FLOAT;
BEGIN
  -- Update upcoming matches to in_progress if match_date has passed
  UPDATE matches
  SET status = 'in_progress',
      updated_at = NOW()
  WHERE status = 'upcoming'
    AND match_date <= NOW();

  RAISE NOTICE 'Updated upcoming matches to in_progress';

  -- Find in_progress matches that have been running for more than 30 seconds
  FOR match_record IN
    SELECT id, odds_a, odds_draw, odds_b
    FROM matches
    WHERE status = 'in_progress'
      AND updated_at <= NOW() - INTERVAL '30 seconds'
  LOOP
    -- Generate weighted random result based on odds
    -- Lower odds = higher probability
    total_weight := (1.0 / match_record.odds_a) + (1.0 / match_record.odds_draw) + (1.0 / match_record.odds_b);
    random_val := random() * total_weight;

    IF random_val < (1.0 / match_record.odds_a) THEN
      random_result := 'A';
    ELSIF random_val < (1.0 / match_record.odds_a) + (1.0 / match_record.odds_draw) THEN
      random_result := 'Draw';
    ELSE
      random_result := 'B';
    END IF;

    -- Update match to finished with result
    UPDATE matches
    SET status = 'finished',
        result = random_result,
        updated_at = NOW()
    WHERE id = match_record.id;

    RAISE NOTICE 'Match % finished with result: %', match_record.id, random_result;
  END LOOP;

  RAISE NOTICE 'Auto progress matches completed';
END;
$$;

-- Remove existing cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-progress-matches') THEN
    PERFORM cron.unschedule('auto-progress-matches');
  END IF;
END $$;

-- Create cron job to run every minute
SELECT cron.schedule(
  'auto-progress-matches',
  '* * * * *',
  'SELECT auto_progress_matches();'
);