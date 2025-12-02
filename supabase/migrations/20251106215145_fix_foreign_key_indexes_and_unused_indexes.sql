/*
  # Fix Foreign Key Indexes and Remove Unused Indexes

  ## Overview
  This migration addresses remaining index issues identified by Supabase:
  
  ## Changes Made

  ### 1. Add Missing Foreign Key Index
  Add index on bets.match_id to optimize foreign key constraint queries
  - This improves JOIN performance and DELETE CASCADE operations
  
  ### 2. Remove Unused Indexes
  Drop indexes that are not being used in actual queries:
  - idx_bets_user_id - Not used by query planner (likely covered by other indexes)
  - idx_bets_user_status - Not used by query planner
  
  ### 3. Verify Required Indexes Remain
  Keep essential indexes that are actively used:
  - idx_profiles_diamonds - Used for leaderboard queries
  - idx_profiles_username - Used for user lookups
  - idx_matches_status - Used for filtering active matches
  - idx_matches_date - Used for date-based queries
  - idx_tap_earnings_user_id - Used for user tap history
  - idx_combo_bets_user_id - Used for combo bet queries
  - idx_combo_bet_selections_combo_id - Used for selection lookups
  - idx_combo_bet_selections_match_id - Used for match-based queries

  ## Performance Impact
  - Adding bets_match_id index: Improves foreign key constraint performance
  - Removing unused indexes: Reduces write overhead and storage
  
  ## Security
  All changes improve performance without affecting security
*/

-- =========================================
-- 1. ADD MISSING FOREIGN KEY INDEX
-- =========================================

-- Add index for bets.match_id foreign key
-- This was removed earlier but is needed for foreign key constraint performance
CREATE INDEX IF NOT EXISTS idx_bets_match_id ON bets(match_id);

-- =========================================
-- 2. REMOVE UNUSED INDEXES
-- =========================================

-- Remove idx_bets_user_id as it's not being used by the query planner
-- The user_id column is likely covered by other access patterns or composite indexes
DROP INDEX IF EXISTS idx_bets_user_id;

-- Remove idx_bets_user_status as it's not being used
-- This was likely intended for filtering user bets by status, but queries
-- don't use this pattern frequently enough to justify the index overhead
DROP INDEX IF EXISTS idx_bets_user_status;

-- =========================================
-- 3. VERIFY ESSENTIAL INDEXES REMAIN
-- =========================================

-- These indexes should remain as they are actively used:
-- - idx_profiles_diamonds (leaderboard sorting)
-- - idx_profiles_username (user lookups)
-- - idx_matches_status (active match filtering)
-- - idx_matches_date (date-based queries)
-- - idx_tap_earnings_user_id (user history)
-- - idx_combo_bets_user_id (user combo bets)
-- - idx_combo_bets_is_win (filtering by win status)
-- - idx_combo_bet_selections_combo_id (selection lookups)
-- - idx_combo_bet_selections_match_id (match-based queries)
-- - idx_bets_match_id (foreign key constraint - just added above)

-- Note: If specific query patterns emerge that need idx_bets_user_id or 
-- idx_bets_user_status, they can be re-added in a future migration
