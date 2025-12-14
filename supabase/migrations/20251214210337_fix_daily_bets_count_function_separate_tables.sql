/*
  # Corriger la fonction de comptage des paris quotidiens
  
  1. Changements
    - Mise à jour de la fonction pour utiliser les tables séparées `bets` et `combo_bets`
    - Les paris simples sont dans la table `bets`
    - Les paris combinés sont dans la table `combo_bets`
    - Utilise le fuseau horaire de Paris
  
  2. Fonctionnement
    - Compte les paris simples de la journée (table bets)
    - Ajoute les paris combinés de la journée (table combo_bets)
    - Chaque combo compte comme 1 seul pari
    - Réinitialisation à 00h00 heure de Paris
*/

-- Recréer la fonction avec la bonne logique
CREATE OR REPLACE FUNCTION get_user_daily_bets_count(
  p_user_id uuid,
  p_target_date date DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_date date;
BEGIN
  -- Use Paris date if no target date provided
  v_date := COALESCE(p_target_date, get_paris_date());
  
  -- Count single bets for the day (in Paris timezone)
  SELECT COUNT(*) INTO v_count
  FROM bets
  WHERE user_id = p_user_id
    AND (created_at AT TIME ZONE 'Europe/Paris')::date = v_date;
  
  -- Add combo bets for the day (each combo counts as 1)
  v_count := v_count + (
    SELECT COUNT(*)
    FROM combo_bets
    WHERE user_id = p_user_id
      AND (created_at AT TIME ZONE 'Europe/Paris')::date = v_date
  );
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Mettre à jour le trigger pour utiliser la bonne logique
CREATE OR REPLACE FUNCTION check_daily_bet_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_count integer;
BEGIN
  -- Get current bet count for today (in Paris timezone)
  v_daily_count := get_user_daily_bets_count(NEW.user_id, NULL);
  
  -- Check if limit is reached
  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Limite journalière atteinte ! Vous ne pouvez placer que 5 paris par jour. Revenez demain pour parier à nouveau.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur la table bets
DROP TRIGGER IF EXISTS enforce_daily_bet_limit_bets ON bets;
CREATE TRIGGER enforce_daily_bet_limit_bets
  BEFORE INSERT ON bets
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_bet_limit();

-- Appliquer le trigger sur la table combo_bets
DROP TRIGGER IF EXISTS enforce_daily_bet_limit_combo ON combo_bets;
CREATE TRIGGER enforce_daily_bet_limit_combo
  BEFORE INSERT ON combo_bets
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_bet_limit();

COMMENT ON FUNCTION get_user_daily_bets_count IS 'Compte le nombre de paris (simples + combos) placés par un utilisateur à une date donnée (heure de Paris)';
COMMENT ON FUNCTION check_daily_bet_limit IS 'Vérifie que l''utilisateur ne dépasse pas la limite de 5 paris par jour (réinitialisée à 00h00 Paris)';
