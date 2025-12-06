/*
  # Add SECURITY DEFINER to get_leaderboard

  1. Issue
    - get_leaderboard was missing SECURITY DEFINER
    - get_friends_leaderboard has SECURITY DEFINER
    - Without SECURITY DEFINER, RLS policies might interfere with function execution
    - This causes get_leaderboard to return no results in some contexts
  
  2. Fix
    - Add SECURITY DEFINER to get_leaderboard
    - Add SECURITY DEFINER to get_user_rank for consistency
    - Both functions now bypass RLS and execute with creator privileges
    - Ensures consistent behavior with get_friends_leaderboard
  
  3. Security
    - These functions only read public leaderboard data
    - No sensitive data is exposed
    - RLS policies already allow anyone to read profiles for leaderboard
    - SECURITY DEFINER is safe for read-only leaderboard functions
*/

-- Recreate get_leaderboard with SECURITY DEFINER
DROP FUNCTION IF EXISTS get_leaderboard(integer, integer);

CREATE OR REPLACE FUNCTION get_leaderboard(
  limit_input integer DEFAULT 100,
  offset_input integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  rank bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.leaderboard_score,
    RANK() OVER (ORDER BY p.leaderboard_score DESC, p.username ASC) as user_rank
  FROM profiles p
  ORDER BY p.leaderboard_score DESC, p.username ASC
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;

-- Recreate get_user_rank with SECURITY DEFINER
DROP FUNCTION IF EXISTS get_user_rank(uuid);

CREATE OR REPLACE FUNCTION get_user_rank(user_id_input uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  rank bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      p.leaderboard_score,
      RANK() OVER (ORDER BY p.leaderboard_score DESC, p.username ASC) as user_rank
    FROM profiles p
  )
  SELECT 
    ru.id,
    ru.username,
    ru.avatar_url,
    ru.leaderboard_score,
    ru.user_rank
  FROM ranked_users ru
  WHERE ru.id = user_id_input;
END;
$$;
