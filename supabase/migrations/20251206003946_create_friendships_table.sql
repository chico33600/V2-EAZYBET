/*
  # Create friendships table for friend system

  1. New Tables
    - `friendships`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `friend_id` (uuid, references profiles)
      - `status` (text, check constraint: pending/accepted/rejected)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `friendships` table
    - Add policy for users to view their own friendships
    - Add policy for users to create friendship requests
    - Add policy for users to accept/reject requests they receive
  
  3. Indexes
    - Unique index on user pair to prevent duplicates
    - Index on status for faster queries
*/

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate friendships
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair
  ON friendships (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Create indexes on user_id and friend_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view friendships where they are involved
CREATE POLICY "Users can view own friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Policy: Users can create friendship requests
CREATE POLICY "Users can send friend requests"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update friendships they receive
CREATE POLICY "Users can accept/reject received requests"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- Policy: Users can delete their own friendship requests
CREATE POLICY "Users can delete own friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);