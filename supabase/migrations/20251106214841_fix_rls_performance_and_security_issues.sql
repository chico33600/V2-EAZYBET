/*
  # Fix RLS Performance and Security Issues

  ## Overview
  This migration addresses performance and security issues identified by Supabase:
  
  ## Changes Made

  ### 1. RLS Performance Optimization
  Replace `auth.uid()` with `(select auth.uid())` in all policies to prevent re-evaluation per row
  
  **Affected policies:**
  - profiles: "Users can update own profile", "Users can insert own profile"
  - bets: "Users can view own bets", "Users can create own bets"
  - tap_earnings: "Users can view own tap earnings", "Users can create own tap earnings"
  - combo_bets: "Users can view own combo bets", "Users can insert own combo bets"
  - combo_bet_selections: "Users can view own combo bet selections", "Users can insert own combo bet selections"
  - matches: "Admins can insert matches", "Admins can update matches", "Admins can delete matches"

  ### 2. Remove Duplicate Policies
  Remove old "Only admins can manage matches" policy that conflicts with specific admin policies

  ### 3. Remove Unused Indexes
  Drop indexes that are not being used to improve write performance
  - idx_bets_match_id (not used in queries)
  - idx_matches_mode_status (mode column doesn't exist)

  ### 4. Fix Function Search Paths
  Add SET search_path for all functions to prevent mutable search path issues
  - update_updated_at_column
  - handle_new_user
  - increment_tokens

  ## Security
  All changes maintain or improve existing security while optimizing performance
*/

-- =========================================
-- 1. FIX RLS POLICIES FOR PROFILES
-- =========================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- =========================================
-- 2. FIX RLS POLICIES FOR BETS
-- =========================================

DROP POLICY IF EXISTS "Users can view own bets" ON bets;
CREATE POLICY "Users can view own bets"
  ON bets FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own bets" ON bets;
CREATE POLICY "Users can create own bets"
  ON bets FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================
-- 3. FIX RLS POLICIES FOR TAP_EARNINGS
-- =========================================

DROP POLICY IF EXISTS "Users can view own tap earnings" ON tap_earnings;
CREATE POLICY "Users can view own tap earnings"
  ON tap_earnings FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own tap earnings" ON tap_earnings;
CREATE POLICY "Users can create own tap earnings"
  ON tap_earnings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================
-- 4. FIX RLS POLICIES FOR COMBO_BETS
-- =========================================

DROP POLICY IF EXISTS "Users can view own combo bets" ON combo_bets;
CREATE POLICY "Users can view own combo bets"
  ON combo_bets FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own combo bets" ON combo_bets;
CREATE POLICY "Users can insert own combo bets"
  ON combo_bets FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- =========================================
-- 5. FIX RLS POLICIES FOR COMBO_BET_SELECTIONS
-- =========================================

DROP POLICY IF EXISTS "Users can view own combo bet selections" ON combo_bet_selections;
CREATE POLICY "Users can view own combo bet selections"
  ON combo_bet_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM combo_bets
      WHERE combo_bets.id = combo_bet_selections.combo_bet_id
      AND combo_bets.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own combo bet selections" ON combo_bet_selections;
CREATE POLICY "Users can insert own combo bet selections"
  ON combo_bet_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM combo_bets
      WHERE combo_bets.id = combo_bet_selections.combo_bet_id
      AND combo_bets.user_id = (select auth.uid())
    )
  );

-- =========================================
-- 6. FIX RLS POLICIES FOR MATCHES (ADMIN)
-- =========================================

-- First, drop the conflicting "Only admins can manage matches" policy
DROP POLICY IF EXISTS "Only admins can manage matches" ON matches;

-- Recreate admin policies with performance optimization
DROP POLICY IF EXISTS "Admins can insert matches" ON matches;
CREATE POLICY "Admins can insert matches"
  ON matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update matches" ON matches;
CREATE POLICY "Admins can update matches"
  ON matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete matches" ON matches;
CREATE POLICY "Admins can delete matches"
  ON matches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =========================================
-- 7. REMOVE UNUSED INDEXES
-- =========================================

-- These indexes are reported as unused
DROP INDEX IF EXISTS idx_bets_match_id;
DROP INDEX IF EXISTS idx_matches_mode_status;

-- Keep idx_bets_user_id as it's used for user bet queries
-- Keep idx_bets_user_status as it's the composite index for filtered queries

-- =========================================
-- 8. FIX FUNCTION SEARCH PATHS
-- =========================================

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;

-- Fix increment_tokens by dropping and recreating with search_path
DROP FUNCTION IF EXISTS increment_tokens(uuid, integer);

CREATE OR REPLACE FUNCTION increment_tokens(
  p_user_id uuid,
  p_amount integer
)
RETURNS integer
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE profiles
  SET tokens = tokens + p_amount
  WHERE id = p_user_id
  RETURNING tokens INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
