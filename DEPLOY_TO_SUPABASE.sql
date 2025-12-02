-- ========================================
-- SCRIPT DE DÉPLOIEMENT COMPLET EAZYBET
-- Base Supabase: vxcsqmydrmcicdruojos
-- ========================================
--
-- Ce script consolide toutes les migrations nécessaires
-- pour que l'application EazyBet fonctionne à 100%
--
-- INSTRUCTIONS:
-- 1. Ouvrez Supabase Dashboard → SQL Editor
-- 2. Collez ce script complet
-- 3. Exécutez-le (cliquez sur "Run")
-- 4. Vérifiez qu'il n'y a pas d'erreurs
-- ========================================

-- ========================================
-- 1. FONCTIONS LEADERBOARD
-- ========================================

-- Fonction: get_leaderboard (classement global avec pagination)
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

-- Fonction: get_user_rank (rang d'un utilisateur spécifique)
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

-- Fonction: get_friends_leaderboard (classement des amis)
CREATE OR REPLACE FUNCTION get_friends_leaderboard(
  user_id_input uuid,
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
  WITH user_friends AS (
    SELECT friend_id FROM friends WHERE user_id = user_id_input
    UNION
    SELECT user_id_input
  ),
  ranked_friends AS (
    SELECT
      p.id,
      p.username,
      p.avatar_url,
      p.leaderboard_score,
      RANK() OVER (ORDER BY p.leaderboard_score DESC, p.username ASC) as user_rank
    FROM profiles p
    INNER JOIN user_friends uf ON p.id = uf.friend_id
  )
  SELECT * FROM ranked_friends
  ORDER BY leaderboard_score DESC, username ASC
  LIMIT limit_input
  OFFSET offset_input;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction: increment_leaderboard_score (mise à jour atomique du score)
CREATE OR REPLACE FUNCTION increment_leaderboard_score(
  user_id_input uuid,
  delta_input bigint
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET leaderboard_score = leaderboard_score + delta_input
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql;

-- Fonction: sync_leaderboard_score (synchroniser score avec diamonds)
CREATE OR REPLACE FUNCTION sync_leaderboard_score()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET leaderboard_score = diamonds;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. TRIGGER DE PARRAINAGE
-- ========================================

-- Fonction: reward_referral (récompense automatique pour parrainage)
CREATE OR REPLACE FUNCTION reward_referral()
RETURNS TRIGGER AS $$
BEGIN
  -- Empêcher l'auto-parrainage
  IF NEW.referrer_id = NEW.referred_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Donner 10 diamants au parrain et mettre à jour le leaderboard
  UPDATE profiles
  SET diamonds = diamonds + 10,
      leaderboard_score = leaderboard_score + 10
  WHERE id = NEW.referrer_id;

  -- Donner 10 diamants au filleul et mettre à jour le leaderboard
  UPDATE profiles
  SET diamonds = diamonds + 10,
      leaderboard_score = leaderboard_score + 10
  WHERE id = NEW.referred_id;

  -- Créer l'amitié bidirectionnelle
  INSERT INTO friends (user_id, friend_id)
  VALUES
    (NEW.referrer_id, NEW.referred_id),
    (NEW.referred_id, NEW.referrer_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Marquer le parrainage comme récompensé
  NEW.rewarded = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_reward_referral ON referrals;
CREATE TRIGGER trigger_reward_referral
  BEFORE INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION reward_referral();

-- ========================================
-- 3. RLS POLICIES (SÉCURITÉ)
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_bet_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tap_earnings ENABLE ROW LEVEL SECURITY;

-- PROFILES: Lecture publique (pour leaderboard), écriture restreinte
DROP POLICY IF EXISTS "Public can read all profiles" ON profiles;
CREATE POLICY "Public can read all profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- MATCHES: Lecture publique, écriture admin uniquement
DROP POLICY IF EXISTS "Public can read matches" ON matches;
CREATE POLICY "Public can read matches"
  ON matches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage matches" ON matches;
CREATE POLICY "Admins can manage matches"
  ON matches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- BETS: Lecture et création pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can read own bets" ON bets;
CREATE POLICY "Users can read own bets"
  ON bets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bets" ON bets;
CREATE POLICY "Users can create own bets"
  ON bets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- COMBO_BETS: Lecture et création pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can read own combo bets" ON combo_bets;
CREATE POLICY "Users can read own combo bets"
  ON combo_bets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own combo bets" ON combo_bets;
CREATE POLICY "Users can create own combo bets"
  ON combo_bets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- REFERRALS: Lecture et création pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;
CREATE POLICY "Users can read own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can create referrals" ON referrals;
CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- FRIENDS: Lecture et création pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can read own friends" ON friends;
CREATE POLICY "Users can read own friends"
  ON friends FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can create friendships" ON friends;
CREATE POLICY "Users can create friendships"
  ON friends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ACHIEVEMENTS: Lecture publique
DROP POLICY IF EXISTS "Public can read achievements" ON achievements;
CREATE POLICY "Public can read achievements"
  ON achievements FOR SELECT
  USING (true);

-- USER_ACHIEVEMENTS: Lecture et création pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can read own achievements" ON user_achievements;
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can claim achievements" ON user_achievements;
CREATE POLICY "Users can claim achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- TAP_EARNINGS: Lecture et création pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can read own tap earnings" ON tap_earnings;
CREATE POLICY "Users can read own tap earnings"
  ON tap_earnings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create tap earnings" ON tap_earnings;
CREATE POLICY "Users can create tap earnings"
  ON tap_earnings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 4. INDEXES POUR PERFORMANCE
-- ========================================

-- Index pour leaderboard (très important pour la performance)
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_score
  ON profiles(leaderboard_score DESC, username);

CREATE INDEX IF NOT EXISTS idx_profiles_top_leaderboard
  ON profiles(leaderboard_score DESC)
  WHERE leaderboard_score > 0;

-- Index pour les paris
CREATE INDEX IF NOT EXISTS idx_bets_user_id
  ON bets(user_id);

CREATE INDEX IF NOT EXISTS idx_bets_match_id
  ON bets(match_id);

-- Index pour les matchs
CREATE INDEX IF NOT EXISTS idx_matches_status
  ON matches(status);

CREATE INDEX IF NOT EXISTS idx_matches_date
  ON matches(match_date);

-- Index pour les amis
CREATE INDEX IF NOT EXISTS idx_friends_user_id
  ON friends(user_id);

CREATE INDEX IF NOT EXISTS idx_friends_friend_id
  ON friends(friend_id);

-- ========================================
-- 5. SYNCHRONISATION INITIALE
-- ========================================

-- Synchroniser les scores du leaderboard avec les diamants actuels
UPDATE profiles
SET leaderboard_score = diamonds
WHERE leaderboard_score != diamonds;

-- ========================================
-- DÉPLOIEMENT TERMINÉ ✅
-- ========================================
--
-- Vérifications à faire:
-- 1. Testez: SELECT * FROM get_leaderboard(10, 0);
-- 2. Testez: SELECT * FROM get_user_rank('votre-user-id'::uuid);
-- 3. Créez un parrainage test pour vérifier les 10 diamants
-- 4. Vérifiez que le classement s'affiche sur /classement
-- 5. Vérifiez que les matchs s'affichent sur /
-- ========================================
