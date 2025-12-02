/*
  # Fix Security and Performance Issues

  1. Index Changes
    - Add missing indexes for foreign keys on bets.match_id and user_achievements.achievement_id
    - Remove unused indexes (idx_bets_user_id, idx_profiles_leaderboard_score, idx_profiles_top_leaderboard)
  
  2. Function Security Fixes
    - Set immutable search_path on all functions to prevent search_path injection attacks
    - Functions affected: get_user_rank, increment_leaderboard_score, log_auth_security_event, get_leaderboard, sync_leaderboard_score
  
  3. Notes
    - Foreign key indexes improve JOIN performance
    - Removing unused indexes reduces write overhead
    - Immutable search_path prevents SQL injection via search_path manipulation
*/

-- ============================================================================
-- STEP 1: Add missing foreign key indexes
-- ============================================================================

-- Index for bets.match_id foreign key
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);

-- Index for user_achievements.achievement_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- ============================================================================
-- STEP 2: Remove unused indexes
-- ============================================================================

-- Drop unused index on bets.user_id (covered by primary key or other queries don't use it)
DROP INDEX IF EXISTS idx_bets_user_id;

-- Drop unused leaderboard indexes
DROP INDEX IF EXISTS idx_profiles_leaderboard_score;
DROP INDEX IF EXISTS idx_profiles_top_leaderboard;

-- ============================================================================
-- STEP 3: Fix function search_path security issues
-- ============================================================================

-- Fix get_user_rank function
DROP FUNCTION IF EXISTS get_user_rank(uuid);
CREATE OR REPLACE FUNCTION get_user_rank(user_id_input uuid)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.leaderboard_score,
      ROW_NUMBER() OVER (ORDER BY p.leaderboard_score DESC, p.created_at ASC) as user_rank
    FROM profiles p
  )
  SELECT 
    ru.user_rank,
    ru.id,
    ru.username,
    ru.avatar_url,
    ru.leaderboard_score
  FROM ranked_users ru
  WHERE ru.id = user_id_input;
END;
$$;

-- Fix increment_leaderboard_score function
DROP FUNCTION IF EXISTS increment_leaderboard_score(uuid, integer);
CREATE OR REPLACE FUNCTION increment_leaderboard_score(user_id_input uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE profiles
  SET leaderboard_score = leaderboard_score + amount
  WHERE id = user_id_input;
END;
$$;

-- Fix log_auth_security_event function
DROP FUNCTION IF EXISTS log_auth_security_event(uuid, text, jsonb);
CREATE OR REPLACE FUNCTION log_auth_security_event(
  user_id_input uuid,
  event_type_input text,
  metadata_input jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO auth_security_log (user_id, event_type, metadata)
  VALUES (user_id_input, event_type_input, metadata_input);
END;
$$;

-- Fix get_leaderboard function
DROP FUNCTION IF EXISTS get_leaderboard(integer, integer);
CREATE OR REPLACE FUNCTION get_leaderboard(limit_input integer DEFAULT 100, offset_input integer DEFAULT 0)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY p.leaderboard_score DESC, p.created_at ASC) as rank,
    p.id as user_id,
    p.username,
    p.avatar_url,
    p.leaderboard_score
  FROM profiles p
  ORDER BY p.leaderboard_score DESC, p.created_at ASC
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;

-- Fix sync_leaderboard_score function
DROP FUNCTION IF EXISTS sync_leaderboard_score(uuid);
CREATE OR REPLACE FUNCTION sync_leaderboard_score(user_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE profiles
  SET leaderboard_score = diamonds
  WHERE id = user_id_input;
END;
$$;
