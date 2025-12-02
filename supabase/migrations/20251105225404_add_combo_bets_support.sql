/*
  # Add combo bets support

  1. New Tables
    - `combo_bets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `amount` (integer) - bet amount
      - `bet_currency` (text) - 'tokens' or 'diamonds'
      - `total_odds` (numeric) - combined odds of all selections
      - `potential_win` (integer) - potential total win
      - `potential_diamonds` (integer) - potential diamonds bonus (for token bets)
      - `is_win` (boolean, nullable) - null=pending, true=won, false=lost
      - `tokens_won` (integer, nullable) - actual tokens won
      - `diamonds_won` (integer, nullable) - actual diamonds won
      - `created_at` (timestamptz)
      
    - `combo_bet_selections`
      - `id` (uuid, primary key)
      - `combo_bet_id` (uuid, foreign key to combo_bets)
      - `match_id` (uuid, foreign key to matches)
      - `choice` (text) - 'A', 'Draw', or 'B'
      - `odds` (numeric) - odds at time of bet
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only view/insert their own combo bets
    - Users can view their own combo bet selections
*/

-- Create combo_bets table
CREATE TABLE IF NOT EXISTS combo_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  bet_currency text DEFAULT 'tokens' CHECK (bet_currency IN ('tokens', 'diamonds')),
  total_odds numeric NOT NULL,
  potential_win integer NOT NULL,
  potential_diamonds integer DEFAULT 0,
  is_win boolean,
  tokens_won integer,
  diamonds_won integer,
  created_at timestamptz DEFAULT now()
);

-- Create combo_bet_selections table
CREATE TABLE IF NOT EXISTS combo_bet_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_bet_id uuid REFERENCES combo_bets(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  choice text NOT NULL CHECK (choice IN ('A', 'Draw', 'B')),
  odds numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE combo_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_bet_selections ENABLE ROW LEVEL SECURITY;

-- Policies for combo_bets
CREATE POLICY "Users can view own combo bets"
  ON combo_bets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own combo bets"
  ON combo_bets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for combo_bet_selections
CREATE POLICY "Users can view own combo bet selections"
  ON combo_bet_selections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM combo_bets
      WHERE combo_bets.id = combo_bet_selections.combo_bet_id
      AND combo_bets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own combo bet selections"
  ON combo_bet_selections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM combo_bets
      WHERE combo_bets.id = combo_bet_selections.combo_bet_id
      AND combo_bets.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_combo_bets_user_id ON combo_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_combo_bets_is_win ON combo_bets(is_win);
CREATE INDEX IF NOT EXISTS idx_combo_bet_selections_combo_id ON combo_bet_selections(combo_bet_id);
CREATE INDEX IF NOT EXISTS idx_combo_bet_selections_match_id ON combo_bet_selections(match_id);
