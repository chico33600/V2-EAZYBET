/*
  # Recreate friends leaderboard function

  1. Functions
    - Drop old `get_friends_leaderboard` function
    - Create new `get_friends_leaderboard` using friendships table with status='accepted'
  
  2. Changes
    - Uses new friendships table instead of old friends table
    - Only includes friends with status='accepted'
    - Includes the current user in the results
*/

-- Drop old function
DROP FUNCTION IF EXISTS get_friends_leaderboard(uuid, integer, integer);

-- Create new function to get friends leaderboard
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
    SELECT friend_user_id AS uid FROM friend_ids
    UNION
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
    INNER JOIN all_user_ids a ON p.id = a.uid
    ORDER BY p.tokens DESC, p.won_bets DESC, p.created_at ASC
  )
  SELECT * FROM ranked_friends
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;
