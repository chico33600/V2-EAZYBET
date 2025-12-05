/*
  # Create system configuration table for API keys
  
  1. New Tables
    - `system_config`
      - `key` (text, primary key) - Configuration key name
      - `value` (text) - Configuration value (encrypted if needed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on system_config table
    - No public access - only service role can access
  
  3. Data
    - Insert ODDS_API_KEY from Vault
*/

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (no policies = only service role can access)
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Insert the ODDS_API_KEY from Vault
INSERT INTO system_config (key, value)
SELECT 'ODDS_API_KEY', vault_get_secret('ODDS_API_KEY')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Create function to get config values (accessible by edge functions)
CREATE OR REPLACE FUNCTION get_system_config(config_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config_value text;
BEGIN
  SELECT value INTO config_value
  FROM system_config
  WHERE key = config_key
  LIMIT 1;
  
  RETURN config_value;
END;
$$;
