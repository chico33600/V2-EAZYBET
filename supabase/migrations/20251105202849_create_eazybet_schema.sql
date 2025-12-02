/*
  # EazyBet Complete Database Schema

  ## Overview
  This migration creates the complete database schema for EazyBet, a betting application
  where users can earn tokens, place bets on matches, and win diamonds based on bet outcomes.

  ## New Tables

  ### 1. `profiles`
  User profiles extending Supabase auth.users
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique)
  - `avatar_url` (text, nullable)
  - `tokens` (integer, default 1000) - Currency for betting
  - `diamonds` (integer, default 0) - Rewards earned from winning bets
  - `total_bets` (integer, default 0) - Statistics
  - `won_bets` (integer, default 0) - Statistics
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `matches`
  Football matches available for betting
  - `id` (uuid, primary key)
  - `team_a` (text) - First team name
  - `team_b` (text) - Second team name
  - `league` (text) - League/competition name
  - `odds_a` (decimal) - Odds for team A win
  - `odds_draw` (decimal) - Odds for draw
  - `odds_b` (decimal) - Odds for team B win
  - `status` (text) - upcoming/live/finished
  - `result` (text, nullable) - A/Draw/B when finished
  - `match_date` (timestamptz) - Scheduled match time
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `bets`
  User bets on matches
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `match_id` (uuid, references matches)
  - `amount` (integer) - Tokens wagered
  - `choice` (text) - A/Draw/B
  - `odds` (decimal) - Odds at time of bet
  - `potential_diamonds` (integer) - Calculated reward
  - `is_win` (boolean, nullable) - null until match finished
  - `diamonds_won` (integer, default 0)
  - `created_at` (timestamptz)

  ### 4. `tap_earnings`
  Track tap-to-earn activity
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `tokens_earned` (integer)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only read/update their own profile
  - Users can read all matches
  - Users can only create/read their own bets
  - Leaderboard data is publicly readable

  ## Indexes
  - Index on profiles.diamonds for leaderboard queries
  - Index on bets.user_id for user bet history
  - Index on matches.status for active matches
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  avatar_url text,
  tokens integer DEFAULT 1000 NOT NULL CHECK (tokens >= 0),
  diamonds integer DEFAULT 0 NOT NULL CHECK (diamonds >= 0),
  total_bets integer DEFAULT 0 NOT NULL,
  won_bets integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a text NOT NULL,
  team_b text NOT NULL,
  league text NOT NULL,
  odds_a decimal(5,2) NOT NULL CHECK (odds_a > 0),
  odds_draw decimal(5,2) NOT NULL CHECK (odds_draw > 0),
  odds_b decimal(5,2) NOT NULL CHECK (odds_b > 0),
  status text DEFAULT 'upcoming' NOT NULL CHECK (status IN ('upcoming', 'live', 'finished')),
  result text CHECK (result IN ('A', 'Draw', 'B')),
  match_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  choice text NOT NULL CHECK (choice IN ('A', 'Draw', 'B')),
  odds decimal(5,2) NOT NULL CHECK (odds > 0),
  potential_diamonds integer NOT NULL CHECK (potential_diamonds > 0),
  is_win boolean,
  diamonds_won integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create tap_earnings table
CREATE TABLE IF NOT EXISTS tap_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tokens_earned integer NOT NULL CHECK (tokens_earned > 0),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_diamonds ON profiles(diamonds DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_tap_earnings_user_id ON tap_earnings(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tap_earnings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Matches policies
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage matches"
  ON matches FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Bets policies
CREATE POLICY "Users can view own bets"
  ON bets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bets"
  ON bets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Tap earnings policies
CREATE POLICY "Users can view own tap earnings"
  ON tap_earnings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tap earnings"
  ON tap_earnings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for matches updated_at
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();