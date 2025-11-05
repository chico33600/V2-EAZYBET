import { supabase } from './supabase-client';

export async function resolveMatchBets(matchId: string, result: 'A' | 'Draw' | 'B') {
  const { data: bets, error: betsError } = await supabase
    .from('bets')
    .select('*, profiles!inner(id, tokens, diamonds, won_bets)')
    .eq('match_id', matchId)
    .is('is_win', null);

  if (betsError || !bets || bets.length === 0) {
    return { processed: 0, message: 'No bets to process' };
  }

  let processed = 0;

  for (const bet of bets) {
    const isWin = bet.choice === result;
    const betCurrency = bet.bet_currency || 'tokens';

    if (isWin) {
      let tokensWon = 0;
      let diamondsWon = 0;

      if (betCurrency === 'tokens') {
        tokensWon = bet.potential_win;
        diamondsWon = bet.potential_diamonds;
      } else {
        tokensWon = 0;
        diamondsWon = bet.potential_win;
      }

      const newTokens = bet.profiles.tokens + tokensWon;
      const newDiamonds = bet.profiles.diamonds + diamondsWon;
      const newWonBets = bet.profiles.won_bets + 1;

      await supabase
        .from('profiles')
        .update({
          tokens: newTokens,
          diamonds: newDiamonds,
          won_bets: newWonBets,
        })
        .eq('id', bet.user_id);

      await supabase
        .from('bets')
        .update({
          is_win: true,
          tokens_won: tokensWon,
          diamonds_won: diamondsWon,
        })
        .eq('id', bet.id);
    } else {
      await supabase
        .from('bets')
        .update({
          is_win: false,
          tokens_won: 0,
          diamonds_won: 0,
        })
        .eq('id', bet.id);
    }

    processed++;
  }

  await supabase
    .from('matches')
    .update({
      status: 'finished',
      result: result,
    })
    .eq('id', matchId);

  return { processed, message: `Successfully processed ${processed} bets` };
}

export async function simulateMatchResult(matchId: string) {
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!match || match.status !== 'upcoming') {
    throw new Error('Match not available for simulation');
  }

  const totalOdds = match.odds_a + match.odds_draw + match.odds_b;
  const probA = match.odds_b / totalOdds;
  const probDraw = match.odds_draw / totalOdds;

  const random = Math.random();
  let result: 'A' | 'Draw' | 'B';

  if (random < probA) {
    result = 'A';
  } else if (random < probA + probDraw) {
    result = 'Draw';
  } else {
    result = 'B';
  }

  return resolveMatchBets(matchId, result);
}
