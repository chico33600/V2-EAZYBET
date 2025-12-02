/*
  # Fix diamond betting constraints
  
  This migration removes the check constraint on potential_diamonds that prevents
  diamond betting from working correctly. The constraint required potential_diamonds > 0,
  but for diamond bets we want to store the diamond winnings in potential_diamonds
  while potential_win can be 0.
  
  ## Changes
  - Drop the check constraint on potential_diamonds to allow 0 values
  - This enables proper diamond betting where:
    * Token bets: potential_win > 0, potential_diamonds = small bonus
    * Diamond bets: potential_win = 0, potential_diamonds = diamond winnings
*/

-- Drop the problematic check constraint on potential_diamonds
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_potential_diamonds_check;
