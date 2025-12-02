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

    if (isWin) {
      let tokensRewarded = 0;
      let diamondsRewarded = 0;

      if (bet.is_diamond_bet) {
        diamondsRewarded = Math.floor(bet.diamonds_staked * bet.odds);
        tokensRewarded = 0;
      } else {
        tokensRewarded = Math.floor(bet.tokens_staked * bet.odds);
        const profit = tokensRewarded - bet.tokens_staked;
        diamondsRewarded = Math.floor(profit * 0.01);
      }

      const newTokens = bet.profiles.tokens + tokensRewarded;
      const newDiamonds = bet.profiles.diamonds + diamondsRewarded;
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
          tokens_won: tokensRewarded,
          diamonds_won: diamondsRewarded,
          tokens_rewarded: tokensRewarded,
          diamonds_rewarded: diamondsRewarded,
        })
        .eq('id', bet.id);
    } else {
      await supabase
        .from('bets')
        .update({
          is_win: false,
          tokens_won: 0,
          diamonds_won: 0,
          tokens_rewarded: 0,
          diamonds_rewarded: 0,
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

  await resolveAffectedComboBets(matchId);

  return { processed, message: `Successfully processed ${processed} bets` };
}

async function resolveAffectedComboBets(matchId: string) {
  const { data: comboSelections } = await supabase
    .from('combo_bet_selections')
    .select('combo_bet_id')
    .eq('match_id', matchId);

  if (!comboSelections || comboSelections.length === 0) {
    return;
  }

  const comboBetIds = Array.from(new Set(comboSelections.map(s => s.combo_bet_id)));

  for (const comboBetId of comboBetIds) {
    await evaluateComboBet(comboBetId);
  }
}

async function evaluateComboBet(comboBetId: string) {
  const { data: comboBet } = await supabase
    .from('combo_bets')
    .select('*, profiles!inner(id, tokens, diamonds, won_bets)')
    .eq('id', comboBetId)
    .is('is_win', null)
    .maybeSingle();

  if (!comboBet) {
    return;
  }

  const { data: selections } = await supabase
    .from('combo_bet_selections')
    .select(`
      *,
      matches!inner(id, status, result)
    `)
    .eq('combo_bet_id', comboBetId);

  if (!selections || selections.length === 0) {
    return;
  }

  const allMatchesFinished = selections.every(sel => sel.matches.status === 'finished');

  if (!allMatchesFinished) {
    return;
  }

  const allSelectionsWon = selections.every(sel => sel.choice === sel.matches.result);

  const betCurrency = comboBet.bet_currency || 'tokens';

  if (allSelectionsWon) {
    let tokensWon = 0;
    let diamondsWon = 0;

    if (betCurrency === 'tokens') {
      tokensWon = comboBet.potential_win;
      diamondsWon = comboBet.potential_diamonds;
    } else {
      tokensWon = 0;
      diamondsWon = comboBet.potential_win;
    }

    const newTokens = comboBet.profiles.tokens + tokensWon;
    const newDiamonds = comboBet.profiles.diamonds + diamondsWon;
    const newWonBets = comboBet.profiles.won_bets + 1;

    await supabase
      .from('profiles')
      .update({
        tokens: newTokens,
        diamonds: newDiamonds,
        won_bets: newWonBets,
      })
      .eq('id', comboBet.user_id);

    await supabase
      .from('combo_bets')
      .update({
        is_win: true,
        tokens_won: tokensWon,
        diamonds_won: diamondsWon,
      })
      .eq('id', comboBetId);
  } else {
    await supabase
      .from('combo_bets')
      .update({
        is_win: false,
        tokens_won: 0,
        diamonds_won: 0,
      })
      .eq('id', comboBetId);
  }
}

export async function resolveAllFinishedMatches() {
  const { data: finishedMatches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'finished')
    .not('result', 'is', null);

  if (error || !finishedMatches || finishedMatches.length === 0) {
    return { resolved: 0, failed: 0, message: 'No finished matches to resolve' };
  }

  let resolved = 0;
  let failed = 0;

  for (const match of finishedMatches) {
    try {
      const result = await resolveMatchBets(match.id, match.result);
      resolved += result.processed;
    } catch (err) {
      console.error(`Failed to resolve match ${match.id}:`, err);
      failed++;
    }
  }

  return { resolved, failed, message: `Resolved ${resolved} bets, ${failed} failures` };
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
