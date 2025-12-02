import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

// This endpoint processes match results and awards diamonds to winners
// In production, this would be called by an admin API or automated system

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, result } = body;

    // Validation
    if (!match_id || !result) {
      return createErrorResponse('Match ID and result are required', 400);
    }

    if (!['A', 'Draw', 'B'].includes(result)) {
      return createErrorResponse('Invalid result. Must be A, Draw, or B', 400);
    }

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .maybeSingle();

    if (matchError || !match) {
      return createErrorResponse('Match not found', 404);
    }

    if (match.status === 'finished' && match.result) {
      return createErrorResponse('Match result already processed', 400);
    }

    // Update match status and result
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({
        status: 'finished',
        result,
      })
      .eq('id', match_id);

    if (updateMatchError) {
      console.error('Match update error:', updateMatchError);
      return createErrorResponse('Failed to update match', 500);
    }

    // Get all bets for this match that haven't been resolved
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('match_id', match_id)
      .is('is_win', null);

    if (betsError) {
      console.error('Bets fetch error:', betsError);
      return createErrorResponse('Failed to fetch bets', 500);
    }

    if (!bets || bets.length === 0) {
      return createSuccessResponse({
        message: 'Match result recorded. No bets to process.',
        match_id,
        result,
        winners: 0,
        losers: 0,
      });
    }

    let winnersCount = 0;
    let losersCount = 0;

    // Process each bet
    for (const bet of bets) {
      const isWin = bet.choice === result;
      let tokensRewarded = 0;
      let diamondsRewarded = 0;

      if (isWin) {
        // Si pari en diamants
        if (bet.is_diamond_bet) {
          diamondsRewarded = Math.floor(bet.diamonds_staked * bet.odds);
        }
        // Si pari en jetons
        else {
          tokensRewarded = Math.floor(bet.tokens_staked * bet.odds);
          // Bonus : 0,01 diamant par jeton de bénéfice
          const profit = tokensRewarded - bet.tokens_staked;
          diamondsRewarded = Math.floor(profit * 0.01);
        }
      }

      // Update bet
      await supabase
        .from('bets')
        .update({
          is_win: isWin,
          tokens_won: tokensRewarded,
          diamonds_won: diamondsRewarded,
          tokens_rewarded: tokensRewarded,
          diamonds_rewarded: diamondsRewarded,
        })
        .eq('id', bet.id);

      if (isWin) {
        winnersCount++;

        // Créditer les gains
        const { data: profile } = await supabase
          .from('profiles')
          .select('tokens, diamonds, won_bets')
          .eq('id', bet.user_id)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              tokens: profile.tokens + tokensRewarded,
              diamonds: profile.diamonds + diamondsRewarded,
              won_bets: profile.won_bets + 1,
            })
            .eq('id', bet.user_id);
        }
      } else {
        losersCount++;
      }
    }

    return createSuccessResponse({
      message: 'Match result processed successfully',
      match_id,
      result,
      winners: winnersCount,
      losers: losersCount,
      total_bets: bets.length,
    });

  } catch (error: any) {
    console.error('Process results error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Get result for a specific match
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const match_id = searchParams.get('match_id');

    if (!match_id) {
      return createErrorResponse('Match ID is required', 400);
    }

    const { data: match, error } = await supabase
      .from('matches')
      .select('id, team_a, team_b, status, result')
      .eq('id', match_id)
      .maybeSingle();

    if (error || !match) {
      return createErrorResponse('Match not found', 404);
    }

    return createSuccessResponse({
      match,
    });

  } catch (error: any) {
    console.error('Get result error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
