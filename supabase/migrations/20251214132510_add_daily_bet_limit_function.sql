/*
  # Add Daily Bet Limit Function
  
  1. New Function
    - `get_user_daily_bets_count(user_id, target_date)` - Returns the number of bets placed by a user on a specific date
    - Counts both single bets and combo bets (combo counts as 1)
    - Uses date in UTC for consistency
  
  2. Purpose
    - Enable strict enforcement of 5 bets per day limit
    - Prevent abuse by counting bets accurately
    - Ensure combo bets count as a single bet
*/

-- Function to count user's bets for a specific day (in UTC)
CREATE OR REPLACE FUNCTION get_user_daily_bets_count(
  p_user_id uuid,
  p_target_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count single bets for the day
  SELECT COUNT(*) INTO v_count
  FROM bets
  WHERE user_id = p_user_id
    AND DATE(created_at) = p_target_date
    AND is_combo = false;
  
  -- Add combo bets for the day (each combo counts as 1)
  v_count := v_count + (
    SELECT COUNT(DISTINCT combo_bet_id)
    FROM bets
    WHERE user_id = p_user_id
      AND DATE(created_at) = p_target_date
      AND is_combo = true
  );
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_daily_bets_count(uuid, date) TO authenticated;

COMMENT ON FUNCTION get_user_daily_bets_count IS 'Returns the number of bets (including combo bets counted as 1) placed by a user on a specific date';