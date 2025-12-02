/*
  # Create cron job for automatic bet resolution
  
  1. Changes
    - Create a SQL function to call the resolve-bets edge function
    - Create a cron job that runs every 1 minute
  
  2. Notes
    - Uses pg_cron extension
    - Uses pg_net to make HTTP requests
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call resolve-bets edge function
CREATE OR REPLACE FUNCTION call_resolve_bets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://eoadmnhdvbrxatdgcsft.supabase.co/functions/v1/resolve-bets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWRtbmhkdmJyeGF0ZGdjc2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk5NTIsImV4cCI6MjA3NzkzNTk1Mn0.5cA06KgQQ5I6mC1RzZFG7zQ1kQePGIPGL0GqoaLBuEw'
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Remove existing cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'resolve-bets-every-minute') THEN
    PERFORM cron.unschedule('resolve-bets-every-minute');
  END IF;
END $$;

-- Create cron job to run every minute
SELECT cron.schedule(
  'resolve-bets-every-minute',
  '* * * * *',
  'SELECT call_resolve_bets();'
);
