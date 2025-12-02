/*
  # Fix Referral System with Profile-Based Trigger

  1. Changes
    - Add referrer_id column to profiles table to store the referrer during signup
    - Create new trigger on profiles table (AFTER INSERT) to handle referrals automatically
    - Keep existing referrals table and trigger for backward compatibility
  
  2. How It Works
    - When a user signs up with ?ref=USER_ID, the referrer_id is stored in profiles
    - After profile creation, the trigger automatically creates the referral entry
    - The existing trigger on referrals then awards diamonds and creates friendship
  
  3. Benefits
    - More reliable: No dependency on frontend API calls
    - Automatic: Works even if frontend fails to call /api/referrals
    - Consistent: All referrals go through the same flow
*/

-- Add referrer_id column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referrer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referrer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on referrer_id for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referrer_id ON profiles(referrer_id) WHERE referrer_id IS NOT NULL;

-- Create function to auto-create referral when profile is created with referrer_id
CREATE OR REPLACE FUNCTION create_referral_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create referral if referrer_id is set and is different from user id
  IF NEW.referrer_id IS NOT NULL AND NEW.referrer_id <> NEW.id THEN
    -- Check if referral already exists
    IF NOT EXISTS (
      SELECT 1 FROM referrals WHERE referred_id = NEW.id
    ) THEN
      -- Insert into referrals table (this will trigger the reward_referral function)
      INSERT INTO referrals (referrer_id, referred_id, rewarded)
      VALUES (NEW.referrer_id, NEW.id, false)
      ON CONFLICT (referred_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_referral_from_profile ON profiles;

-- Create trigger on profiles table
CREATE TRIGGER trigger_create_referral_from_profile
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_referral_from_profile();

-- Add comment to explain the system
COMMENT ON COLUMN profiles.referrer_id IS 'ID of the user who referred this user. Set during signup via ?ref=USER_ID';
COMMENT ON FUNCTION create_referral_from_profile IS 'Automatically creates a referral entry when a profile is created with a referrer_id';
