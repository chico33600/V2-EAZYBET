import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface OddsAPIMatch {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return createErrorResponse('Unauthorized', 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return createErrorResponse('Failed to fetch user profile', 500);
    }

    if (!profile || profile.role !== 'admin') {
      console.error('User is not admin. Profile:', profile);
      return createErrorResponse('Access denied: Admin role required', 403);
    }

    const apiKey = process.env.ODDS_API_KEY;

    if (!apiKey) {
      return createErrorResponse('API key not configured', 500);
    }

    const apiUrl = `https://api.the-odds-api.com/v4/sports/soccer_france_ligue_one/odds/?regions=eu&markets=h2h&apiKey=${apiKey}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error('Odds API error:', response.statusText);
      return createErrorResponse('Failed to fetch matches from API', 500);
    }

    const matches: OddsAPIMatch[] = await response.json();

    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const match of matches) {
      try {
        const commenceTime = new Date(match.commence_time);

        if (commenceTime <= now || commenceTime > sevenDaysFromNow) {
          skippedCount++;
          continue;
        }

        let oddsA = 2.0;
        let oddsDraw = 3.0;
        let oddsB = 2.5;

        if (match.bookmakers && match.bookmakers.length > 0) {
          const bookmaker = match.bookmakers[0];
          const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');

          if (h2hMarket && h2hMarket.outcomes) {
            const homeOutcome = h2hMarket.outcomes.find(o => o.name === match.home_team);
            const awayOutcome = h2hMarket.outcomes.find(o => o.name === match.away_team);
            const drawOutcome = h2hMarket.outcomes.find(o => o.name === 'Draw');

            if (homeOutcome) oddsA = homeOutcome.price;
            if (awayOutcome) oddsB = awayOutcome.price;
            if (drawOutcome) oddsDraw = drawOutcome.price;
          }
        }

        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('external_api_id', match.id)
          .eq('api_provider', 'the-odds-api')
          .maybeSingle();

        if (existingMatch) {
          const { error: updateError } = await supabase
            .from('matches')
            .update({
              odds_a: oddsA,
              odds_draw: oddsDraw,
              odds_b: oddsB,
              match_date: commenceTime.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMatch.id);

          if (updateError) {
            console.error('Update error:', updateError);
            errorCount++;
          } else {
            updatedCount++;
          }
        } else {
          const { error: insertError } = await supabase
            .from('matches')
            .insert({
              team_a: match.home_team,
              team_b: match.away_team,
              league: 'Ligue 1',
              odds_a: oddsA,
              odds_draw: oddsDraw,
              odds_b: oddsB,
              status: 'upcoming',
              match_date: commenceTime.toISOString(),
              match_mode: 'real',
              external_api_id: match.id,
              api_provider: 'the-odds-api',
            });

          if (insertError) {
            console.error('Insert error:', insertError);
            errorCount++;
          } else {
            syncedCount++;
          }
        }
      } catch (err) {
        console.error('Error processing match:', err);
        errorCount++;
      }
    }

    const { error: statusUpdateError } = await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('match_mode', 'real')
      .eq('status', 'upcoming')
      .lte('match_date', now.toISOString());

    if (statusUpdateError) {
      console.error('Status update error:', statusUpdateError);
    }

    const { error: deleteOldError } = await supabase
      .from('matches')
      .delete()
      .eq('match_mode', 'real')
      .or(`match_date.lt.${now.toISOString()},match_date.gt.${sevenDaysFromNow.toISOString()}`);

    if (deleteOldError) {
      console.error('Delete old matches error:', deleteOldError);
    }

    return createSuccessResponse({
      message: 'Matches synchronized successfully',
      stats: {
        total: matches.length,
        synced: syncedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
