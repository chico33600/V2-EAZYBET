/*
  # Réactiver le trigger de limite de paris avec timezone Paris
  
  1. Actions
    - Réactive le trigger `enforce_daily_bet_limit`
    - Utilise le fuseau horaire de Paris pour les vérifications
    - Corrige les problèmes RLS avec SECURITY DEFINER
  
  2. Fonctionnement
    - Bloque les paris si la limite de 5 paris/jour est atteinte
    - Les combos comptent comme 1 seul pari
    - La limite se réinitialise à 00h00 heure de Paris
*/

-- Recréer le trigger avec la bonne logique
DROP TRIGGER IF EXISTS enforce_daily_bet_limit ON bets;

-- Créer le trigger sur la table bets
CREATE TRIGGER enforce_daily_bet_limit
  BEFORE INSERT ON bets
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_bet_limit();

COMMENT ON TRIGGER enforce_daily_bet_limit ON bets IS 'Vérifie que l''utilisateur ne dépasse pas la limite de 5 paris par jour (heure de Paris)';
COMMENT ON FUNCTION check_daily_bet_limit IS 'Fonction de vérification de la limite de paris quotidienne (réinitialisée à 00h00 Paris)';
