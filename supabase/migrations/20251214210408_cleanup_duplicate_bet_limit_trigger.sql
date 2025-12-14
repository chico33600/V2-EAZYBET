/*
  # Nettoyer les triggers dupliqués
  
  1. Actions
    - Supprimer l'ancien trigger `enforce_daily_bet_limit`
    - Garder uniquement `enforce_daily_bet_limit_bets` et `enforce_daily_bet_limit_combo`
  
  2. Raison
    - Éviter les vérifications en double
    - Simplifier la maintenance
*/

-- Supprimer l'ancien trigger
DROP TRIGGER IF EXISTS enforce_daily_bet_limit ON bets;

COMMENT ON TRIGGER enforce_daily_bet_limit_bets ON bets IS 'Vérifie la limite de 5 paris par jour pour les paris simples (réinitialisée à 00h00 Paris)';
COMMENT ON TRIGGER enforce_daily_bet_limit_combo ON combo_bets IS 'Vérifie la limite de 5 paris par jour pour les paris combinés (réinitialisée à 00h00 Paris)';
