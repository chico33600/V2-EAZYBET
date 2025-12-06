/*
  # Fix friends leaderboard to show only accepted friends

  1. Changes
    - Drop and recreate get_friends_leaderboard to ensure it uses friendships table
    - Only return users with status='accepted' in friendships table
    - If no friends exist, return only the current user
  
  2. Important
    - This ensures Global leaderboard shows everyone
    - Friends leaderboard shows ONLY accepted friends
    - No fallback to all users
*/

-- Drop the function completely
DROP FUNCTION IF EXISTS get_friends_leaderboard(uuid, integer, integer);

-- Recreate with strict filtering
CREATE OR REPLACE FUNCTION get_friends_leaderboard(
  user_id_input uuid,
  limit_input int DEFAULT 100,
  offset_input int DEFAULT 0
)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    -- Get all accepted friends (bidirectional)
    SELECT DISTINCT
      CASE
        WHEN f.user_id = user_id_input THEN f.friend_id
        WHEN f.friend_id = user_id_input THEN f.user_id
      END AS friend_user_id
    FROM friendships f
    WHERE (f.user_id = user_id_input OR f.friend_id = user_id_input)
      AND f.status = 'accepted'
  ),
  all_user_ids AS (
    -- Include friends
    SELECT friend_user_id AS uid FROM friend_ids WHERE friend_user_id IS NOT NULL
    UNION
    -- Include the current user
    SELECT user_id_input AS uid
  ),
  ranked_friends AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY p.tokens DESC, p.won_bets DESC, p.created_at ASC) AS rank,
      p.id AS user_id,
      p.username,
      p.avatar_url,
      p.tokens AS leaderboard_score
    FROM profiles p
    WHERE p.id IN (SELECT uid FROM all_user_ids WHERE uid IS NOT NULL)
    ORDER BY p.tokens DESC, p.won_bets DESC, p.created_at ASC
  )
  SELECT * FROM ranked_friends
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;
