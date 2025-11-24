-- ======================================
-- 1. TABLES
-- ======================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    tokens BIGINT DEFAULT 1000,
    diamonds BIGINT DEFAULT 0,
    leaderboard_score BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_key TEXT NOT NULL,
    league TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    match_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'upcoming',
    home_score INT,
    away_score INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    selected_outcome TEXT NOT NULL,
    amount BIGINT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    referred_user UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward_diamonds INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tap_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 2. FUNCTIONS
-- ======================================

-- ╔══════════════════════════════════════╗
-- ║ Increment tokens (Tap-to-Earn)       ║
-- ╚══════════════════════════════════════╝
CREATE OR REPLACE FUNCTION increment_tokens(uid UUID, amount BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE new_total BIGINT;
BEGIN
    UPDATE profiles
    SET tokens = tokens + amount
    WHERE id = uid
    RETURNING tokens INTO new_total;

    RETURN new_total;
END;
$$;

-- ╔══════════════════════════════════════╗
-- ║ Leaderboard functions                ║
-- ╚══════════════════════════════════════╝
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INT DEFAULT 50, offset_count INT DEFAULT 0)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    tokens BIGINT,
    diamonds BIGINT,
    leaderboard_score BIGINT
)
LANGUAGE sql
AS $$
    SELECT id, username, tokens, diamonds, leaderboard_score
    FROM profiles
    ORDER BY leaderboard_score DESC
    LIMIT limit_count
    OFFSET offset_count;
$$;

CREATE OR REPLACE FUNCTION get_user_rank(target_user UUID)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    leaderboard_score BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT rank, id, username, leaderboard_score
    FROM (
        SELECT id,
               username,
               leaderboard_score,
               RANK() OVER (ORDER BY leaderboard_score DESC) AS rank
        FROM profiles
    ) AS ranked
    WHERE id = target_user;
END;
$$;

-- ╔══════════════════════════════════════╗
-- ║ Referral reward trigger              ║
-- ╚══════════════════════════════════════╝
CREATE OR REPLACE FUNCTION reward_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE profiles
    SET diamonds = diamonds + 10,
        leaderboard_score = leaderboard_score + 10
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_referral ON referrals;
CREATE TRIGGER trg_reward_referral
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION reward_referral();

-- ======================================
-- 3. RLS POLICIES
-- ======================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tap_earnings ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Bets
DROP POLICY IF EXISTS "Users can read their own bets" ON bets;
CREATE POLICY "Users can read their own bets"
ON bets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can place bets" ON bets;
CREATE POLICY "Users can place bets"
ON bets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Tap earnings
DROP POLICY IF EXISTS "Users can read own tap earnings" ON tap_earnings;
CREATE POLICY "Users can read own tap earnings"
ON tap_earnings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create tap earnings" ON tap_earnings;
CREATE POLICY "Users can create tap earnings"
ON tap_earnings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Achievements
DROP POLICY IF EXISTS "Users can claim achievements" ON user_achievements;
CREATE POLICY "Users can claim achievements"
ON user_achievements FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ======================================
-- 4. INDEXES
-- ======================================

CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_score
ON profiles(leaderboard_score DESC, username);

CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);

CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- ======================================
-- 5. INITIAL SYNC
-- ======================================

UPDATE profiles
SET leaderboard_score = diamonds
WHERE leaderboard_score IS NULL OR leaderboard_score != diamonds;

-- ======================================
-- FIN ✔️
-- ======================================
