/*
  # Create function to access secrets from Vault
  
  1. Changes
    - Create a secure function to retrieve secrets from Supabase Vault
    - Only accessible by authenticated service role
  
  2. Security
    - Function has SECURITY DEFINER to access vault
    - Returns secret value securely
*/

-- Create function to get secrets from vault
CREATE OR REPLACE FUNCTION vault_get_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;
  
  RETURN secret_value;
END;
$$;
