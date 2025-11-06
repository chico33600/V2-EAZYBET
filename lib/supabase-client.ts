import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Types for database tables
export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  tokens: number;
  diamonds: number;
  total_bets: number;
  won_bets: number;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  team_a: string;
  team_b: string;
  league?: string;
  competition?: string;
  odds_a: number;
  odds_draw: number;
  odds_b: number;
  status: 'upcoming' | 'live' | 'finished';
  result: 'A' | 'Draw' | 'B' | null;
  match_date: string;
  created_at: string;
  updated_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  match_id: string;
  amount: number;
  choice: 'A' | 'Draw' | 'B';
  odds: number;
  potential_diamonds: number;
  is_win: boolean | null;
  diamonds_won: number;
  created_at: string;
}

export interface TapEarning {
  id: string;
  user_id: string;
  tokens_earned: number;
  created_at: string;
}
