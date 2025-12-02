/*
  # Update handle_new_user to Support Referrals

  1. Changes
    - Update handle_new_user function to extract referrer_id from user metadata
    - Pass referrer_id when creating the profile
    - This triggers the automatic referral creation via trigger_create_referral_from_profile
  
  2. Flow
    - User signs up with metadata: { username, referrer_id }
    - handle_new_user creates profile with both fields
    - trigger_create_referral_from_profile detects referrer_id and creates referral entry
    - trigger_reward_referral awards diamonds and creates friendship
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
  v_referrer_id uuid;
BEGIN
  -- Extract username from metadata or generate default
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8));
  
  -- Extract referrer_id from metadata if present
  v_referrer_id := NULL;
  IF NEW.raw_user_meta_data ? 'referrer_id' THEN
    BEGIN
      v_referrer_id := (NEW.raw_user_meta_data->>'referrer_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      -- If conversion fails, just ignore and leave as NULL
      v_referrer_id := NULL;
    END;
  END IF;

  -- Insert profile with referrer_id (if provided)
  INSERT INTO public.profiles (id, username, referrer_id)
  VALUES (NEW.id, v_username, v_referrer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'auth';

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user IS 'Creates user profile after auth.users insert. Extracts username and referrer_id from metadata.';
