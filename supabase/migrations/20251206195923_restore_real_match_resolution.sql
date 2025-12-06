/*
  # Restore real match resolution from TheOddsAPI

  1. Changes
    - Remove the auto_progress_matches function that generates fake results
    - Remove the auto-progress-matches cron job
    - Update sync-matches cron to run every 1 minute instead of every 2 hours
    - This restores the proper flow: sync-matches gets real scores from TheOddsAPI, then resolve-bets distributes winnings

  2. Notes
    - Matches will now get real results from TheOddsAPI via sync-matches edge function
    - sync-matches runs every minute and only calls TheOddsAPI when there are finished matches without results
    - resolve-bets continues to run every minute and works purely from database data
    - No API calls are made from the frontend or from resolve-bets
*/

-- Remove the auto-progress-matches cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-progress-matches') THEN
    PERFORM cron.unschedule('auto-progress-matches');
    RAISE NOTICE 'Removed auto-progress-matches cron job';
  END IF;
END $$;

-- Drop the auto_progress_matches function
DROP FUNCTION IF EXISTS auto_progress_matches();

-- Remove the old sync-matches cron job (every 2 hours)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-matches-every-2-hours') THEN
    PERFORM cron.unschedule('sync-matches-every-2-hours');
    RAISE NOTICE 'Removed old sync-matches-every-2-hours cron job';
  END IF;
END $$;

-- Remove the old trigger function if it exists
DROP FUNCTION IF EXISTS trigger_match_sync();

-- Create new function to call sync-matches edge function
CREATE OR REPLACE FUNCTION call_sync_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pg_net to call the edge function
  PERFORM net.http_post(
    url := 'https://eoadmnhdvbrxatdgcsft.supabase.co/functions/v1/sync-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWRtbmhkdmJyeGF0ZGdjc2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk5NTIsImV4cCI6MjA3NzkzNTk1Mn0.5cA06KgQQ5I6mC1RzZFG7zQ1kQePGIPGL0GqoaLBuEw'
    ),
    body := '{}'::jsonb
  );

  RAISE NOTICE 'sync-matches edge function called';
END;
$$;

-- Remove any existing sync-matches cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-matches-every-minute') THEN
    PERFORM cron.unschedule('sync-matches-every-minute');
  END IF;
END $$;

-- Create new cron job to run sync-matches every 1 minute
SELECT cron.schedule(
  'sync-matches-every-minute',
  '* * * * *',
  'SELECT call_sync_matches();'
);

-- Verify cron jobs
DO $$
DECLARE
  job_record RECORD;
BEGIN
  RAISE NOTICE '=== Active Cron Jobs ===';
  FOR job_record IN
    SELECT jobname, schedule, command
    FROM cron.job
    WHERE jobname IN ('sync-matches-every-minute', 'resolve-bets-every-minute')
    ORDER BY jobname
  LOOP
    RAISE NOTICE 'Job: % | Schedule: % | Command: %',
      job_record.jobname,
      job_record.schedule,
      job_record.command;
  END LOOP;
END $$;
