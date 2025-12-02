/*
  # Add Admin Match Management Policies

  1. Changes
    - Add policy for admins to insert matches
    - Add policy for admins to update matches
    - Add policy for admins to delete matches
    
  2. Security
    - Only users with role 'admin' can manage matches
    - Regular users can only read matches
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can insert matches" ON matches;
DROP POLICY IF EXISTS "Admins can update matches" ON matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON matches;

-- Allow admins to insert matches
CREATE POLICY "Admins can insert matches"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update matches
CREATE POLICY "Admins can update matches"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete matches
CREATE POLICY "Admins can delete matches"
  ON matches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );