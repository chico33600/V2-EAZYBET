/*
  # Align leaderboard scoring criteria between global and friends

  1. Changes
    - Update get_friends_leaderboard to use leaderboard_score like get_leaderboard
    - Ensure both functions use identical sorting criteria
    - Maintains filtering: friends only show accepted friendships + referrals
  
  2. Important
    - Global uses leaderboard_score for ranking
    - Friends must also use leaderboard_score for consistency
    - Both leaderboards now have identical sorting logic
*/

-- Drop and recreate with consistent scoring
DROP FUNCTION IF EXISTS get_friends_leaderboard(uuid, integer, integer);

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
    -- Get accepted friends from friendships table (bidirectional)
    SELECT DISTINCT
      CASE
        WHEN f.user_id = user_id_input THEN f.friend_id
        WHEN f.friend_id = user_id_input THEN f.user_id
      END AS friend_user_id
    FROM friendships f
    WHERE (f.user_id = user_id_input OR f.friend_id = user_id_input)
      AND f.status = 'accepted'
  ),
  referral_ids AS (
    -- Get referral connections (parrain/filleul)
    SELECT DISTINCT
      CASE
        WHEN r.referrer_id = user_id_input THEN r.referred_id
        WHEN r.referred_id = user_id_input THEN r.referrer_id
      END AS referral_user_id
    FROM referrals r
    WHERE (r.referrer_id = user_id_input OR r.referred_id = user_id_input)
  ),
  all_friend_ids AS (
    -- Combine friends and referrals
    SELECT friend_user_id AS uid FROM friend_ids WHERE friend_user_id IS NOT NULL
    UNION
    SELECT referral_user_id AS uid FROM referral_ids WHERE referral_user_id IS NOT NULL
    UNION
    -- Include current user
    SELECT user_id_input AS uid
  ),
  ranked_friends AS (
    SELECT
      RANK() OVER (ORDER BY p.leaderboard_score DESC, p.username ASC) AS rank,
      p.id AS user_id,
      p.username,
      p.avatar_url,
      p.leaderboard_score
    FROM profiles p
    WHERE p.id IN (SELECT uid FROM all_friend_ids WHERE uid IS NOT NULL)
    ORDER BY p.leaderboard_score DESC, p.username ASC
  )
  SELECT * FROM ranked_friends
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;
