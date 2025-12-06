/*
  # Create function to get user rank in friends leaderboard

  1. New Function
    - `get_user_friends_rank` returns the user's rank among their friends
    - Takes user_id_input as parameter
    - Returns same structure as get_user_rank but calculates rank only among friends
    - Includes both accepted friends and referral connections
    
  2. Important
    - Rank is calculated ONLY among friends, not globally
    - Uses same scoring criteria as get_friends_leaderboard
    - Returns null if user not found
*/

CREATE OR REPLACE FUNCTION get_user_friends_rank(user_id_input uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  rank bigint
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
      ROW_NUMBER() OVER (ORDER BY p.tokens DESC, p.won_bets DESC, p.created_at ASC) AS rank,
      p.id AS user_id,
      p.username,
      p.avatar_url,
      p.tokens AS leaderboard_score
    FROM profiles p
    WHERE p.id IN (SELECT uid FROM all_friend_ids WHERE uid IS NOT NULL)
  )
  SELECT * FROM ranked_friends
  WHERE ranked_friends.user_id = user_id_input;
END;
$$;
