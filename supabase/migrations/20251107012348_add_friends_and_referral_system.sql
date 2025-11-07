/*
  # Add Friends and Referral System

  ## Overview
  Implements a complete friends and referral system for EazyBetCoin.
  Users can add friends, view their friends list, and refer new users for rewards.

  ## New Tables

  ### 1. friends
  Stores friend relationships between users
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - User who added the friend
  - `friend_id` (uuid, foreign key) - User who was added as friend
  - `created_at` (timestamp) - When friendship was created
  - Unique constraint on (user_id, friend_id) to prevent duplicates

  ### 2. referrals
  Tracks referral relationships and rewards
  - `id` (uuid, primary key) - Unique identifier
  - `referrer_id` (uuid, foreign key) - User who referred someone
  - `referred_id` (uuid, foreign key) - User who was referred
  - `rewarded` (boolean) - Whether the reward was given
  - `created_at` (timestamp) - When referral was created

  ## Views

  ### friends_view
  Bidirectional view of friendships - if A adds B, both see each other as friends

  ## Functions

  ### get_user_friends(user_id)
  Returns all friends of a user with their stats (username, avatar, leaderboard_score)

  ### get_friends_leaderboard(user_id, limit, offset)
  Returns leaderboard filtered to show only the user and their friends

  ### reward_referral()
  Trigger function that automatically rewards both referrer and referred user with 10 diamonds

  ## Security
  - RLS enabled on both tables
  - Users can only see their own friend relationships
  - Users can only see referrals they're involved in
  - Automatic reward distribution via trigger

  ## Indexes
  - Composite indexes on user_id and friend_id for fast lookups
  - Index on referrer_id and referred_id for referral queries
*/

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rewarded boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (referred_id)
);

-- Create indexes for friends table
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_created_at ON friends(created_at DESC);

-- Create indexes for referrals table
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_rewarded ON referrals(rewarded) WHERE NOT rewarded;

-- Enable RLS
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Friends RLS policies
CREATE POLICY "Users can view their own friendships"
  ON friends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add friends"
  ON friends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove friends"
  ON friends FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Referrals RLS policies
CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can create referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update referral rewards"
  ON referrals FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Create bidirectional friends view
CREATE OR REPLACE VIEW friends_view AS
SELECT DISTINCT
  CASE 
    WHEN f.user_id = p.id THEN f.friend_id
    ELSE f.user_id
  END as friend_id,
  p.id as user_id,
  f.created_at
FROM friends f
CROSS JOIN profiles p
WHERE p.id = f.user_id OR p.id = f.friend_id;

-- Function to get user's friends with their stats
CREATE OR REPLACE FUNCTION get_user_friends(user_id_input uuid)
RETURNS TABLE(
  friend_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    CASE 
      WHEN f.user_id = user_id_input THEN f.friend_id
      ELSE f.user_id
    END as friend_id,
    p.username,
    p.avatar_url,
    p.leaderboard_score,
    f.created_at
  FROM friends f
  JOIN profiles p ON (
    (f.user_id = user_id_input AND p.id = f.friend_id) OR
    (f.friend_id = user_id_input AND p.id = f.user_id)
  )
  WHERE f.user_id = user_id_input OR f.friend_id = user_id_input
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get friends leaderboard
CREATE OR REPLACE FUNCTION get_friends_leaderboard(
  user_id_input uuid,
  limit_input integer DEFAULT 100,
  offset_input integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT DISTINCT
      CASE 
        WHEN f.user_id = user_id_input THEN f.friend_id
        ELSE f.user_id
      END as id
    FROM friends f
    WHERE f.user_id = user_id_input OR f.friend_id = user_id_input
    UNION
    SELECT user_id_input as id
  ),
  ranked_friends AS (
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.leaderboard_score,
      RANK() OVER (ORDER BY p.leaderboard_score DESC, p.username ASC) as user_rank
    FROM profiles p
    WHERE p.id IN (SELECT id FROM friend_ids)
  )
  SELECT 
    rf.id,
    rf.username,
    rf.avatar_url,
    rf.leaderboard_score,
    rf.user_rank
  FROM ranked_friends rf
  ORDER BY rf.leaderboard_score DESC, rf.username ASC
  LIMIT limit_input
  OFFSET offset_input;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to reward referral (10 diamonds to both users)
CREATE OR REPLACE FUNCTION reward_referral()
RETURNS TRIGGER AS $$
BEGIN
  -- Give 10 diamonds to referrer
  UPDATE profiles 
  SET diamonds = diamonds + 10,
      leaderboard_score = leaderboard_score + 10
  WHERE id = NEW.referrer_id;
  
  -- Give 10 diamonds to referred user
  UPDATE profiles 
  SET diamonds = diamonds + 10,
      leaderboard_score = leaderboard_score + 10
  WHERE id = NEW.referred_id;
  
  -- Mark as rewarded
  NEW.rewarded = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically reward referrals
DROP TRIGGER IF EXISTS trigger_reward_referral ON referrals;
CREATE TRIGGER trigger_reward_referral
  BEFORE INSERT ON referrals
  FOR EACH ROW
  WHEN (NEW.rewarded = false)
  EXECUTE FUNCTION reward_referral();

-- Function to search users by username
CREATE OR REPLACE FUNCTION search_users_by_username(
  search_query text,
  current_user_id uuid,
  limit_input integer DEFAULT 20
)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  is_friend boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.leaderboard_score,
    EXISTS(
      SELECT 1 FROM friends f 
      WHERE (f.user_id = current_user_id AND f.friend_id = p.id)
         OR (f.friend_id = current_user_id AND f.user_id = p.id)
    ) as is_friend
  FROM profiles p
  WHERE p.id != current_user_id
    AND p.username ILIKE '%' || search_query || '%'
  ORDER BY p.leaderboard_score DESC
  LIMIT limit_input;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
