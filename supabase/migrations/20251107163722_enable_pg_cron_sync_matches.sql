/*
  # Enable pg_cron and setup automatic match synchronization

  1. Configuration
    - Enable pg_cron extension for scheduled tasks
    - Create function to call Edge Function
    - Create cron job to sync matches every 2 hours
  
  2. Scheduled Task
    - Calls the sync-matches Edge Function every 2 hours
    - Runs at: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create function to trigger match sync
CREATE OR REPLACE FUNCTION trigger_match_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response extensions.http_response;
BEGIN
  -- Call the Edge Function
  SELECT * INTO response
  FROM extensions.http((
    'POST',
    'https://eoadmnhdvbrxatdgcsft.supabase.co/functions/v1/sync-matches',
    ARRAY[
      extensions.http_header('Content-Type', 'application/json'),
      extensions.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYWRtbmhkdmJyeGF0ZGdjc2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTk5NTIsImV4cCI6MjA3NzkzNTk1Mn0.5cA06KgQQ5I6mC1RzZFG7zQ1kQePGIPGL0GqoaLBuEw')
    ],
    'application/json',
    '{}'
  )::extensions.http_request);
  
  -- Log response
  RAISE NOTICE 'Match sync triggered. Status: %', response.status;
END;
$$;

-- Remove existing cron job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('sync-matches-every-2-hours');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule function to run every 2 hours
SELECT cron.schedule(
  'sync-matches-every-2-hours',
  '0 */2 * * *',
  'SELECT trigger_match_sync();'
);
