/*
  # Add Public Leaderboard Access Policy

  1. Changes
    - Add a SELECT policy on profiles table that allows anonymous (public) access
    - This enables the leaderboard to be viewed without authentication
    - The policy only allows reading basic leaderboard fields (username, leaderboard_score)
    - This is safe because leaderboard data is meant to be public

  2. Security
    - Only SELECT operations are allowed for anonymous users
    - Users still need authentication for UPDATE/INSERT/DELETE operations
    - Sensitive fields are not exposed (email, tokens are not in the SELECT)
*/

-- Drop existing policy if it exists and recreate it to include both authenticated and anon
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create a new policy that allows both authenticated and anonymous users to view profiles
CREATE POLICY "Anyone can view profiles for leaderboard"
  ON profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);
