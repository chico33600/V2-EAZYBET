/*
  # Fix referral trigger to add friendship

  1. Changes
    - Updates the trigger function `reward_referral()` to:
      - Prevent self-referral
      - Award 10 diamonds to both referrer and referred user
      - Update leaderboard scores
      - Creates bidirectional friendship
      - Mark referral as rewarded

  2. Security
    - Validates referrer_id ≠ referred_id
    - Uses ON CONFLICT DO NOTHING for friendship creation
    - Atomic operation ensures both users get rewards or neither does

  3. Notes
    - Trigger executes automatically on INSERT into referrals table
    - Friendship is bidirectional (both directions inserted)
*/

-- Drop and recreate the trigger function with friendship creation
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

  -- Create bidirectional friendship
  INSERT INTO friends (user_id, friend_id)
  VALUES
    (NEW.referrer_id, NEW.referred_id),
    (NEW.referred_id, NEW.referrer_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Mark referral as rewarded
  NEW.rewarded = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
