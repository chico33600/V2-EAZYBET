/*
  # Fix Global Leaderboard to use leaderboard_score

  1. Issue
    - get_leaderboard was using p.diamonds
    - get_friends_leaderboard uses p.leaderboard_score
    - This inconsistency causes different ranking logic
  
  2. Fix
    - Update get_leaderboard to use p.leaderboard_score
    - Both functions now use identical scoring metric
    - Ensures Global and Friends leaderboards are properly aligned
  
  3. Important
    - leaderboard_score is the canonical metric for rankings
    - Both Global and Friends leaderboards must use the same column
*/

-- Drop and recreate get_leaderboard with correct column
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
) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- Also update get_user_rank to use leaderboard_score
DROP FUNCTION IF EXISTS get_user_rank(uuid);

CREATE OR REPLACE FUNCTION get_user_rank(user_id_input uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  rank bigint
) AS $$
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
$$ LANGUAGE plpgsql STABLE;
