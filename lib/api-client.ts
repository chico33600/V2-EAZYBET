import { supabase } from './supabase-client';
import type { Match, Bet } from './supabase-client';
import { useCacheStore } from './store';

export async function fetchMatches(status?: string): Promise<Match[]> {
  let query = supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }

  return data || [];
}

function getSportTimeHorizon(sportType?: string): number {
  switch (sportType) {
    case 'nba':
      return 1;
    case 'nfl':
      return 3;
    case 'mma':
      return 5;
    case 'soccer':
    default:
      return 7;
  }
}

export async function fetchAvailableMatches(mode?: 'fictif' | 'real', sportType?: string, useCache: boolean = true): Promise<Match[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cacheKey = `${mode || 'all'}_${sportType || 'all'}`;
  const cachedData = useCache ? useCacheStore.getState().getMatchesCache(cacheKey) : null;

  if (cachedData) {
    console.log('[fetchAvailableMatches] Returning cached data for:', cacheKey);
    return cachedData;
  }

  console.log('[fetchAvailableMatches] Cache miss, fetching from API for:', cacheKey);

  const now = new Date();
  const nowISO = now.toISOString();

  await updateMatchStatusesInternal(nowISO);

  const daysAhead = getSportTimeHorizon(sportType);
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  console.log('[fetchAvailableMatches] Parameters:', {
    mode,
    sportType,
    daysAhead,
    now: nowISO,
    futureDate: futureDate.toISOString()
  });

  let query = supabase
    .from('matches')
    .select('*')
    .eq('status', 'upcoming')
    .gt('match_date', nowISO)
    .lte('match_date', futureDate.toISOString())
    .order('match_date', { ascending: true });

  if (mode) {
    query = query.eq('match_mode', mode);
  }

  if (sportType) {
    query = query.eq('sport_type', sportType);
  }

  const { data: matches, error } = await query;

  console.log('[fetchAvailableMatches] Query result:', {
    matchCount: matches?.length || 0,
    error: error?.message,
    firstMatch: matches?.[0]
  });

  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }

  const { data: userBets } = await supabase
    .from('bets')
    .select('match_id')
    .eq('user_id', user.id)
    .is('is_win', null);

  const { data: comboBets } = await supabase
    .from('combo_bets')
    .select('combo_bet_selections(match_id)')
    .eq('user_id', user.id)
    .is('is_win', null);

  const bettedMatchIds = new Set<string>();

  if (userBets) {
    userBets.forEach(bet => bettedMatchIds.add(bet.match_id));
  }

  if (comboBets) {
    comboBets.forEach(combo => {
      if (combo.combo_bet_selections) {
        combo.combo_bet_selections.forEach((sel: any) => {
          bettedMatchIds.add(sel.match_id);
        });
      }
    });
  }

  console.log('[fetchAvailableMatches] Filtering:', {
    totalMatches: matches?.length || 0,
    bettedMatches: bettedMatchIds.size,
    availableMatches: (matches || []).filter(match => !bettedMatchIds.has(match.id)).length
  });

  const filteredMatches = (matches || []).filter(match => !bettedMatchIds.has(match.id));

  useCacheStore.getState().setMatchesCache(cacheKey, filteredMatches);
  console.log('[fetchAvailableMatches] Cached data for:', cacheKey);

  return filteredMatches;
}

async function updateMatchStatusesInternal(now: string) {
  console.log('[updateMatchStatuses] Updating match statuses at', now);

  await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('status', 'upcoming')
    .lte('match_date', now);

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('matches')
    .update({ status: 'finished' })
    .in('status', ['upcoming', 'live'])
    .lt('match_date', twoHoursAgo);
}

export async function placeBet(matchId: string, amount: number, choice: 'A' | 'Draw' | 'B', currency: 'tokens' | 'diamonds' = 'tokens') {
  if (amount <= 0) {
    throw new Error('Le montant doit être supérieur à 0');
  }

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (!match) {
    throw new Error('Match non trouvé');
  }

  if (match.status !== 'upcoming') {
    throw new Error('Ce match n\'est plus disponible pour les paris');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Non authentifié');
  }

  // Check daily bet limit - function uses Paris timezone by default
  const { data: dailyBetsCount } = await supabase
    .rpc('get_user_daily_bets_count', {
      p_user_id: user.id,
      p_target_date: null
    });

  const DAILY_BET_LIMIT = 5;
  if (dailyBetsCount && dailyBetsCount >= DAILY_BET_LIMIT) {
    throw new Error(`Limite journalière atteinte ! Vous ne pouvez placer que ${DAILY_BET_LIMIT} paris par jour. Revenez demain pour parier à nouveau.`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tokens, diamonds, total_bets')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profil non trouvé');
  }

  if (currency === 'tokens' && profile.tokens < amount) {
    throw new Error('Jetons insuffisants');
  }

  if (currency === 'diamonds' && profile.diamonds < amount) {
    throw new Error('Diamants insuffisants');
  }

  const odds = choice === 'A' ? match.odds_a : choice === 'Draw' ? match.odds_draw : match.odds_b;

  const updateData: any = {
    total_bets: profile.total_bets + 1
  };

  if (currency === 'tokens') {
    updateData.tokens = profile.tokens - amount;
  } else {
    updateData.diamonds = profile.diamonds - amount;
  }

  await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  const { data: bet, error } = await supabase
    .from('bets')
    .insert({
      user_id: user.id,
      match_id: matchId,
      amount,
      choice,
      odds,
      bet_currency: currency,
      is_diamond_bet: currency === 'diamonds',
      tokens_staked: currency === 'tokens' ? amount : 0,
      diamonds_staked: currency === 'diamonds' ? amount : 0,
      potential_win: 0,
      potential_diamonds: 0,
    })
    .select()
    .single();

  if (error) {
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
      .eq('id', user.id);
    throw new Error('Erreur lors du pari');
  }

  return bet;
}

export async function placeCombobet(
  selections: Array<{ matchId: string; choice: 'A' | 'Draw' | 'B'; odds: number }>,
  amount: number,
  currency: 'tokens' | 'diamonds' = 'tokens'
) {
  if (amount <= 0) {
    throw new Error('Le montant doit être supérieur à 0');
  }

  if (selections.length < 2) {
    throw new Error('Un pari combiné nécessite au moins 2 sélections');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Non authentifié');
  }

  // Check daily bet limit (combo bet counts as 1) - function uses Paris timezone by default
  const { data: dailyBetsCount } = await supabase
    .rpc('get_user_daily_bets_count', {
      p_user_id: user.id,
      p_target_date: null
    });

  const DAILY_BET_LIMIT = 5;
  if (dailyBetsCount && dailyBetsCount >= DAILY_BET_LIMIT) {
    throw new Error(`Limite journalière atteinte ! Vous ne pouvez placer que ${DAILY_BET_LIMIT} paris par jour. Revenez demain pour parier à nouveau.`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tokens, diamonds, total_bets')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    throw new Error('Profil non trouvé');
  }

  if (currency === 'tokens' && profile.tokens < amount) {
    throw new Error('Jetons insuffisants');
  }

  if (currency === 'diamonds' && profile.diamonds < amount) {
    throw new Error('Diamants insuffisants');
  }

  const matchIds = selections.map(s => s.matchId);
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, status')
    .in('id', matchIds);

  if (matchesError || !matches || matches.length !== selections.length) {
    throw new Error('Un ou plusieurs matchs sont introuvables');
  }

  const unavailableMatch = matches.find(m => m.status !== 'upcoming');
  if (unavailableMatch) {
    throw new Error('Un ou plusieurs matchs ne sont plus disponibles pour les paris');
  }

  const totalOdds = selections.reduce((acc, sel) => acc * sel.odds, 1);
  const totalWin = Math.round(amount * totalOdds);
  const profit = totalWin - amount;
  const diamondsFromProfit = currency === 'tokens' ? Math.round(profit * 0.01) : 0;

  const updateData: any = {
    total_bets: profile.total_bets + 1
  };

  if (currency === 'tokens') {
    updateData.tokens = profile.tokens - amount;
  } else {
    updateData.diamonds = profile.diamonds - amount;
  }

  await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  const { data: comboBet, error: comboBetError } = await supabase
    .from('combo_bets')
    .insert({
      user_id: user.id,
      amount,
      bet_currency: currency,
      total_odds: totalOdds,
      potential_win: totalWin,
      potential_diamonds: diamondsFromProfit,
    })
    .select()
    .single();

  if (comboBetError) {
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
      .eq('id', user.id);
    throw new Error('Erreur lors du pari combiné');
  }

  const selectionsToInsert = selections.map(sel => ({
    combo_bet_id: comboBet.id,
    match_id: sel.matchId,
    choice: sel.choice,
    odds: sel.odds,
  }));

  const { error: selectionsError } = await supabase
    .from('combo_bet_selections')
    .insert(selectionsToInsert);

  if (selectionsError) {
    await supabase
      .from('combo_bets')
      .delete()
      .eq('id', comboBet.id);

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
      .eq('id', user.id);
    throw new Error('Erreur lors de la création des sélections');
  }

  return comboBet;
}

export async function getUserBets(status?: 'active' | 'history', useCache: boolean = true): Promise<any[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cacheStore = useCacheStore.getState();
  let cachedData = null;

  if (useCache) {
    if (status === 'active') {
      cachedData = cacheStore.getActiveBetsCache();
    } else if (status === 'history') {
      cachedData = cacheStore.getHistoryBetsCache();
    }

    if (cachedData) {
      console.log('[getUserBets] Returning cached data for:', status);
      return cachedData;
    }
  }

  console.log('[getUserBets] Cache miss, fetching from API for:', status);

  let simpleBetsQuery = supabase
    .from('bets')
    .select(`
      *,
      matches:match_id (
        id,
        team_a,
        team_b,
        competition,
        status,
        result,
        match_date,
        odds_a,
        odds_draw,
        odds_b
      )
    `)
    .eq('user_id', user.id);

  let comboBetsQuery = supabase
    .from('combo_bets')
    .select(`
      *,
      combo_bet_selections (
        choice,
        odds,
        matches:match_id (
          id,
          team_a,
          team_b,
          competition,
          status,
          result,
          match_date,
          odds_a,
          odds_draw,
          odds_b
        )
      )
    `)
    .eq('user_id', user.id);

  if (status === 'active') {
    simpleBetsQuery = simpleBetsQuery.is('is_win', null);
    comboBetsQuery = comboBetsQuery.is('is_win', null);
  } else if (status === 'history') {
    simpleBetsQuery = simpleBetsQuery.not('is_win', 'is', null);
    comboBetsQuery = comboBetsQuery.not('is_win', 'is', null);
  }

  const [simpleBetsResult, comboBetsResult] = await Promise.all([
    simpleBetsQuery.order('created_at', { ascending: false }),
    comboBetsQuery.order('created_at', { ascending: false })
  ]);

  const simpleBets = simpleBetsResult.data || [];
  const comboBets = (comboBetsResult.data || []).map(bet => ({
    ...bet,
    is_combo: true
  }));

  const allBets = [...simpleBets, ...comboBets].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (status === 'active') {
    cacheStore.setActiveBetsCache(allBets);
  } else if (status === 'history') {
    cacheStore.setHistoryBetsCache(allBets);
  }

  console.log('[getUserBets] Cached data for:', status);

  return allBets;
}

export function invalidateBetsCache() {
  const cacheStore = useCacheStore.getState();
  cacheStore.setActiveBetsCache([], 0);
  console.log('[invalidateBetsCache] Active bets cache invalidated');
}

export function invalidateMatchesCache() {
  const cacheStore = useCacheStore.getState();
  cacheStore.matchesBySport = {};
  console.log('[invalidateMatchesCache] Matches cache invalidated');
}

export function invalidateProfileCache() {
  const cacheStore = useCacheStore.getState();
  cacheStore.setProfileCache(null, 0);
  console.log('[invalidateProfileCache] Profile cache invalidated');
}

export async function resetUserAccount() {
  const response = await fetch('/api/user/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la réinitialisation');
  }

  return response.json();
}

export async function earnTokens(taps: number = 1) {
  console.log('[earnTokens] ========== START ==========');
  console.log('[earnTokens] Called with taps:', taps);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('[earnTokens] Auth check:', { hasUser: !!user, userId: user?.id, authError });

  if (!user) {
    console.error('[earnTokens] No user found!');
    throw new Error('Non authentifié');
  }

  const tokensEarned = taps * 1;

  console.log('[earnTokens] Tokens to earn:', tokensEarned);

  console.log('[earnTokens] Calling increment_tokens RPC...');
  const { data: newBalance, error: updateError } = await supabase
    .rpc('increment_tokens', {
      p_user_id: user.id,
      p_amount: tokensEarned
    });

  console.log('[earnTokens] RPC result:', { newBalance, updateError });

  if (updateError) {
    console.error('[earnTokens] RPC error details:', JSON.stringify(updateError));
    throw new Error('Erreur lors de la mise à jour des jetons: ' + updateError.message);
  }

  console.log('[earnTokens] Inserting tap record...');
  const { error: insertError } = await supabase
    .from('tap_earnings')
    .insert({
      user_id: user.id,
      tokens_earned: tokensEarned,
    });

  console.log('[earnTokens] Insert result:', { insertError });

  const result = {
    tokens_earned: tokensEarned,
    new_balance: newBalance,
    remaining_taps: null,
  };

  console.log('[earnTokens] ========== SUCCESS ==========');
  console.log('[earnTokens] Returning:', result);

  return result;
}

export async function getLeaderboard(limit: number = 100, offset: number = 0) {
  const { data: players, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, diamonds, total_bets, won_bets')
    .order('diamonds', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  return (players || []).map((player, index) => ({
    rank: offset + index + 1,
    ...player,
    win_rate: player.total_bets > 0
      ? Math.round((player.won_bets / player.total_bets) * 100)
      : 0,
  }));
}
