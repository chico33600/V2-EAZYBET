/*
  # Update referral trigger to use friendships table

  1. Changes
    - Updates reward_referral() function to insert into friendships instead of friends
    - Sets status='accepted' automatically for referral-based friendships
    - Maintains all existing parrainage logic (bonus, diamonds, etc.)
  
  2. Important
    - Parrainage continues to work exactly as before
    - But now creates entries in friendships table with status='accepted'
    - This ensures parrain/filleul are automatically friends
*/

-- Update the trigger function to use friendships table
CREATE OR REPLACE FUNCTION reward_referral()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-referral
  IF NEW.referrer_id = NEW.referred_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Award 10 diamonds to referrer and update leaderboard
  UPDATE profiles
  SET diamonds = diamonds + 10,
      leaderboard_score = leaderboard_score + 10
  WHERE id = NEW.referrer_id;

  -- Award 10 diamonds to referred user and update leaderboard
  UPDATE profiles
  SET diamonds = diamonds + 10,
      leaderboard_score = leaderboard_score + 10
  WHERE id = NEW.referred_id;

  -- Create friendship with status='accepted' (using new friendships table)
  -- Only insert one row with the unique pair constraint handling bidirectionality
  INSERT INTO friendships (user_id, friend_id, status)
  VALUES (
    LEAST(NEW.referrer_id, NEW.referred_id),
    GREATEST(NEW.referrer_id, NEW.referred_id),
    'accepted'
  )
  ON CONFLICT DO NOTHING;

  -- Mark referral as rewarded
  NEW.rewarded = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
