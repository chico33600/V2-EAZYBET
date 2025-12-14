/*
  # Désactiver temporairement le trigger de limite de paris
  
  1. Action
    - Désactive le trigger `enforce_daily_bet_limit` qui cause des erreurs 400
    - Ce trigger sera réactivé et corrigé plus tard
  
  2. Raison
    - Le trigger bloque actuellement tous les paris avec des erreurs 400
    - Les policies RLS causent des problèmes d'accès dans le trigger
*/

-- Désactiver le trigger temporairement
DROP TRIGGER IF EXISTS enforce_daily_bet_limit ON bets;

COMMENT ON FUNCTION check_daily_bet_limit IS 'DÉSACTIVÉ TEMPORAIREMENT - Trigger causant des erreurs 400. À corriger.';
