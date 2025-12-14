/*
  # Fix Daily Bets Count to Use Paris Timezone
  
  1. Changes
    - Update `get_user_daily_bets_count` function to use Paris timezone (Europe/Paris)
    - Convert all date comparisons to Paris timezone
    - Add function to get current date in Paris timezone
  
  2. Purpose
    - Ensure daily bet limit resets at 00:00 Paris time
    - Consistent timezone handling across the application
    - Prevent timezone-related bugs
*/

-- Function to get current date in Paris timezone
CREATE OR REPLACE FUNCTION get_paris_date()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'Europe/Paris')::date;
$$;

-- Update function to count user's bets for a specific day in Paris timezone
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
    AND (created_at AT TIME ZONE 'Europe/Paris')::date = v_date
    AND is_combo = false;
  
  -- Add combo bets for the day (each combo counts as 1)
  v_count := v_count + (
    SELECT COUNT(DISTINCT combo_bet_id)
    FROM bets
    WHERE user_id = p_user_id
      AND (created_at AT TIME ZONE 'Europe/Paris')::date = v_date
      AND is_combo = true
      AND combo_bet_id IS NOT NULL
  );
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Update bet limit trigger to use Paris timezone
CREATE OR REPLACE FUNCTION check_daily_bet_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_count integer;
  v_new_combo_id uuid;
BEGIN
  -- Get current bet count for today (in Paris timezone)
  v_daily_count := get_user_daily_bets_count(NEW.user_id, NULL);
  
  -- If this is a combo bet, check if it's a new combo_bet_id
  IF NEW.is_combo = true AND NEW.combo_bet_id IS NOT NULL THEN
    -- Check if this combo_bet_id already exists in today's bets
    SELECT combo_bet_id INTO v_new_combo_id
    FROM bets
    WHERE user_id = NEW.user_id
      AND (created_at AT TIME ZONE 'Europe/Paris')::date = get_paris_date()
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_paris_date() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_bets_count(uuid, date) TO authenticated;

COMMENT ON FUNCTION get_paris_date IS 'Returns the current date in Paris timezone (Europe/Paris)';
COMMENT ON FUNCTION get_user_daily_bets_count IS 'Returns the number of bets (including combo bets counted as 1) placed by a user on a specific date in Paris timezone';
