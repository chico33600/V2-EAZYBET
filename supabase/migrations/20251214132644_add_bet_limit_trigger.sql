/*
  # Add Bet Limit Trigger
  
  1. New Trigger Function
    - `check_daily_bet_limit()` - Prevents insertion of bets if user has reached daily limit
    - Enforces 5 bets per day limit at database level
    - Combo bets count as 1 bet
  
  2. Security
    - Database-level enforcement prevents bypass attempts
    - Works even if frontend/API checks fail
    - Reliable across multiple devices
*/

-- Function to check daily bet limit before insertion
CREATE OR REPLACE FUNCTION check_daily_bet_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_count integer;
  v_new_combo_id uuid;
BEGIN
  -- Get current bet count for today
  v_daily_count := get_user_daily_bets_count(NEW.user_id, CURRENT_DATE);
  
  -- If this is a combo bet, check if it's a new combo_bet_id
  IF NEW.is_combo = true AND NEW.combo_bet_id IS NOT NULL THEN
    -- Check if this combo_bet_id already exists in today's bets
    SELECT combo_bet_id INTO v_new_combo_id
    FROM bets
    WHERE user_id = NEW.user_id
      AND DATE(created_at) = CURRENT_DATE
      AND combo_bet_id = NEW.combo_bet_id
    LIMIT 1;
    
    -- If combo already exists, allow insertion (it's part of the same combo)
    IF v_new_combo_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Check if limit is reached
  IF v_daily_count >= 5 THEN
    RAISE EXCEPTION 'Limite journalière atteinte ! Vous ne pouvez placer que 5 paris par jour. Revenez demain pour parier à nouveau.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bets table
DROP TRIGGER IF EXISTS enforce_daily_bet_limit ON bets;
CREATE TRIGGER enforce_daily_bet_limit
  BEFORE INSERT ON bets
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_bet_limit();

COMMENT ON FUNCTION check_daily_bet_limit IS 'Enforces 5 bets per day limit at database level. Combo bets count as 1 bet.';