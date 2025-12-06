/*
  # Add win rate to leaderboard system

  1. Changes
    - Add win_rate (success rate %) to all leaderboard functions
    - Use win_rate as secondary sorting criterion after leaderboard_score
    - Win rate calculation: (won_bets / total_bets) * 100, rounded to 2 decimals
    - If no bets, win_rate = 0

  2. Sorting Order
    - Primary: leaderboard_score (DESC)
    - Secondary: win_rate (DESC)
    - Tertiary: username (ASC)

  3. Functions Updated
    - get_leaderboard: Global leaderboard with win rate
    - get_user_rank: User's global rank with win rate
    - get_friends_leaderboard: Friends leaderboard with win rate
    - get_user_friends_rank: User's rank among friends with win rate
*/

-- Update get_leaderboard to include win_rate
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
  win_rate numeric,
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
    CASE
      WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
      ELSE 0::numeric
    END as win_rate,
    RANK() OVER (
      ORDER BY
        p.leaderboard_score DESC,
        CASE
          WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
          ELSE 0::numeric
        END DESC,
        p.username ASC
    ) as user_rank
  FROM profiles p
  ORDER BY
    p.leaderboard_score DESC,
    CASE
      WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
      ELSE 0::numeric
    END DESC,
    p.username ASC
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;

-- Update get_user_rank to include win_rate
DROP FUNCTION IF EXISTS get_user_rank(uuid);

CREATE OR REPLACE FUNCTION get_user_rank(user_id_input uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  win_rate numeric,
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
      CASE
        WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
        ELSE 0::numeric
      END as win_rate,
      RANK() OVER (
        ORDER BY
          p.leaderboard_score DESC,
          CASE
            WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
            ELSE 0::numeric
          END DESC,
          p.username ASC
      ) as user_rank
    FROM profiles p
  )
  SELECT
    ru.id,
    ru.username,
    ru.avatar_url,
    ru.leaderboard_score,
    ru.win_rate,
    ru.user_rank
  FROM ranked_users ru
  WHERE ru.id = user_id_input;
END;
$$;

-- Update get_friends_leaderboard to include win_rate
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
  leaderboard_score bigint,
  win_rate numeric
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
      RANK() OVER (
        ORDER BY
          p.leaderboard_score DESC,
          CASE
            WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
            ELSE 0::numeric
          END DESC,
          p.username ASC
      ) AS rank,
      p.id AS user_id,
      p.username,
      p.avatar_url,
      p.leaderboard_score,
      CASE
        WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
        ELSE 0::numeric
      END as win_rate
    FROM profiles p
    WHERE p.id IN (SELECT uid FROM all_friend_ids WHERE uid IS NOT NULL)
    ORDER BY
      p.leaderboard_score DESC,
      CASE
        WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
        ELSE 0::numeric
      END DESC,
      p.username ASC
  )
  SELECT * FROM ranked_friends
  LIMIT limit_input
  OFFSET offset_input;
END;
$$;

-- Update get_user_friends_rank to include win_rate
DROP FUNCTION IF EXISTS get_user_friends_rank(uuid);

CREATE OR REPLACE FUNCTION get_user_friends_rank(user_id_input uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  leaderboard_score bigint,
  win_rate numeric,
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
      RANK() OVER (
        ORDER BY
          p.leaderboard_score DESC,
          CASE
            WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
            ELSE 0::numeric
          END DESC,
          p.username ASC
      ) AS rank,
      p.id AS user_id,
      p.username,
      p.avatar_url,
      p.leaderboard_score,
      CASE
        WHEN p.total_bets > 0 THEN ROUND((p.won_bets::numeric / p.total_bets::numeric * 100), 2)
        ELSE 0::numeric
      END as win_rate
    FROM profiles p
    WHERE p.id IN (SELECT uid FROM all_friend_ids WHERE uid IS NOT NULL)
  )
  SELECT * FROM ranked_friends
  WHERE ranked_friends.user_id = user_id_input;
END;
$$;