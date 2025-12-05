/*
  # Configure ODDS_API_KEY secret in Supabase Vault
  
  1. Changes
    - Store the ODDS_API_KEY in Supabase Vault for edge functions to access
  
  2. Security
    - Uses vault.create_secret to securely store the API key
    - Only accessible by edge functions with proper permissions
*/

-- Store the ODDS_API_KEY in Supabase Vault
SELECT vault.create_secret('668d44f3e234e3ee2cf49ff4bf9455b1', 'ODDS_API_KEY');
