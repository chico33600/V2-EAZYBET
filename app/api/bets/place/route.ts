import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

function calculateDiamonds(amount: number, odds: number): number {
  // Diamond formula: (amount × odds) / 10 rounded
  return Math.round((amount * odds) / 10);
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { match_id, amount, choice, currency = 'tokens' } = body;

    // Validation
    if (!match_id || !amount || !choice) {
      return createErrorResponse('Match ID, amount, and choice are required', 400);
    }

    if (!['A', 'Draw', 'B'].includes(choice)) {
      return createErrorResponse('Invalid choice. Must be A, Draw, or B', 400);
    }

    if (!['tokens', 'diamonds'].includes(currency)) {
      return createErrorResponse('Invalid currency. Must be tokens or diamonds', 400);
    }

    if (amount < 10) {
      return createErrorResponse('Minimum bet amount is 10', 400);
    }

    // Get match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .maybeSingle();

    if (matchError || !match) {
      return createErrorResponse('Match not found', 404);
    }

    if (match.status !== 'upcoming') {
      return createErrorResponse('Cannot bet on this match. It has already started or finished.', 400);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens, diamonds, total_bets')
      .eq('id', user!.id)
      .maybeSingle();

    if (profileError || !profile) {
      return createErrorResponse('Profile not found', 404);
    }

    // Check balance based on currency
    if (currency === 'tokens' && profile.tokens < amount) {
      return createErrorResponse('Insufficient tokens', 400);
    }

    if (currency === 'diamonds' && profile.diamonds < amount) {
      return createErrorResponse('Insufficient diamonds', 400);
    }

    // Get appropriate odds
    const odds = choice === 'A' ? match.odds_a : choice === 'Draw' ? match.odds_draw : match.odds_b;
    const totalWin = Math.round(amount * odds);
    const profit = totalWin - amount;
    const potentialDiamonds = currency === 'tokens' ? Math.round(profit * 0.01) : 0;

    // Deduct from balance based on currency
    const updateData: any = {
      total_bets: profile.total_bets + 1
    };

    if (currency === 'tokens') {
      updateData.tokens = profile.tokens - amount;
    } else {
      updateData.diamonds = profile.diamonds - amount;
    }

    const { error: deductError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user!.id);

    if (deductError) {
      console.error('Balance deduction error:', deductError);
      return createErrorResponse('Failed to place bet', 500);
    }

    // Create bet
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        user_id: user!.id,
        match_id,
        amount,
        choice,
        odds,
        potential_win: totalWin,
        potential_diamonds: potentialDiamonds,
        bet_currency: currency,
      })
      .select()
      .single();

    if (betError) {
      console.error('Bet creation error:', betError);
      // Try to refund balance
      const rollbackData: any = {
        total_bets: profile.total_bets
      };
      if (currency === 'tokens') {
        rollbackData.tokens = profile.tokens;
      } else {
        rollbackData.diamonds = profile.diamonds;
      }
      await supabase
        .from('profiles')
        .update(rollbackData)
        .eq('id', user!.id);
      return createErrorResponse('Failed to place bet', 500);
    }

    return createSuccessResponse({
      message: 'Bet placed successfully!',
      bet: {
        id: bet.id,
        match_id: bet.match_id,
        amount: bet.amount,
        choice: bet.choice,
        odds: bet.odds,
        potential_win: bet.potential_win,
        potential_diamonds: bet.potential_diamonds,
        bet_currency: bet.bet_currency,
        created_at: bet.created_at,
      },
      new_balance: currency === 'tokens' ? profile.tokens - amount : profile.diamonds - amount,
      currency,
    }, 201);

  } catch (error: any) {
    console.error('Place bet error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active or history

    let query = supabase
      .from('bets')
      .select(`
        *,
        matches:match_id (
          id,
          team_a,
          team_b,
          league,
          status,
          result,
          match_date
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.is('is_win', null);
    } else if (status === 'history') {
      query = query.not('is_win', 'is', null);
    }

    const { data: bets, error } = await query;

    if (error) {
      console.error('Fetch bets error:', error);
      return createErrorResponse('Failed to fetch bets', 500);
    }

    return createSuccessResponse({
      bets: bets || [],
    });

  } catch (error: any) {
    console.error('Fetch bets error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
