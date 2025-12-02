import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { match_id, amount, choice, stakeType = 'tokens' } = body;

    if (!match_id || !amount || !choice) {
      return createErrorResponse('Match ID, amount, and choice are required', 400);
    }

    if (!['A', 'Draw', 'B'].includes(choice)) {
      return createErrorResponse('Invalid choice. Must be A, Draw, or B', 400);
    }

    if (!['tokens', 'diamonds'].includes(stakeType)) {
      return createErrorResponse('Invalid stake type. Must be tokens or diamonds', 400);
    }

    if (amount <= 0) {
      return createErrorResponse('Bet amount must be greater than 0', 400);
    }

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tokens, diamonds')
      .eq('id', user!.id)
      .maybeSingle();

    if (profileError || !profile) {
      return createErrorResponse('Profile not found', 404);
    }

    if (stakeType === 'diamonds') {
      if (profile.diamonds < amount) {
        return createErrorResponse('Insufficient diamonds', 400);
      }
    } else {
      if (profile.tokens < amount) {
        return createErrorResponse('Insufficient tokens', 400);
      }
    }

    const odds = choice === 'A' ? match.odds_a : choice === 'Draw' ? match.odds_draw : match.odds_b;

    const updateData = stakeType === 'diamonds'
      ? { diamonds: profile.diamonds - amount }
      : { tokens: profile.tokens - amount };

    const { error: deductError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user!.id);

    if (deductError) {
      console.error('Balance deduction error:', deductError);
      return createErrorResponse('Failed to place bet', 500);
    }

    const betData: any = {
      user_id: user!.id,
      match_id,
      amount,
      choice,
      odds,
      bet_currency: stakeType,
      is_diamond_bet: stakeType === 'diamonds',
      tokens_staked: stakeType === 'tokens' ? amount : 0,
      diamonds_staked: stakeType === 'diamonds' ? amount : 0,
      potential_win: 0,
      potential_diamonds: 0,
    };

    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert(betData)
      .select()
      .single();

    if (betError) {
      console.error('Bet creation error:', betError);
      const refundData = stakeType === 'diamonds'
        ? { diamonds: profile.diamonds }
        : { tokens: profile.tokens };
      await supabase
        .from('profiles')
        .update(refundData)
        .eq('id', user!.id);
      return createErrorResponse('Failed to place bet', 500);
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('total_bets')
      .eq('id', user!.id)
      .maybeSingle();

    if (currentProfile) {
      await supabase
        .from('profiles')
        .update({ total_bets: currentProfile.total_bets + 1 })
        .eq('id', user!.id);
    }

    const responseData: any = {
      message: 'Bet placed successfully!',
      bet: {
        id: bet.id,
        match_id: bet.match_id,
        amount: bet.amount,
        choice: bet.choice,
        odds: bet.odds,
        stake_type: stakeType,
        created_at: bet.created_at,
      },
    };

    if (stakeType === 'diamonds') {
      responseData.new_diamond_balance = profile.diamonds - amount;
    } else {
      responseData.new_token_balance = profile.tokens - amount;
    }

    return createSuccessResponse(responseData, 201);

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
    const status = searchParams.get('status');

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
