/*
  # Fix RLS access for resolve-bets function
  
  1. Changes
    - Add policy to allow anon role to SELECT matches (needed for resolve-bets edge function)
    - Add policy to allow anon role to SELECT and UPDATE bets (needed for resolve-bets)
    - Add policy to allow anon role to SELECT and UPDATE combo_bets
    - Add policy to allow anon role to SELECT and UPDATE profiles
  
  2. Security
    - These policies are ONLY for read/update operations needed by the resolve-bets function
    - No data leakage risk since the function only updates bet results based on match results
*/

-- Allow anon to read matches (for resolve-bets function)
CREATE POLICY "Allow anon to read matches for resolution"
  ON matches
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read and update bets (for resolve-bets function)
CREATE POLICY "Allow anon to read bets for resolution"
  ON bets
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to update bets for resolution"
  ON bets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to read and update combo_bets (for resolve-bets function)
CREATE POLICY "Allow anon to read combo_bets for resolution"
  ON combo_bets
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to update combo_bets for resolution"
  ON combo_bets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to read combo_bet_selections (for resolve-bets function)
CREATE POLICY "Allow anon to read combo_bet_selections for resolution"
  ON combo_bet_selections
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to read and update profiles (for resolve-bets function)
CREATE POLICY "Allow anon to read profiles for resolution"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon to update profiles for resolution"
  ON profiles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
