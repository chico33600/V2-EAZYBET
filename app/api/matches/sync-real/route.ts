import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';
import { getTeamImages } from '@/lib/team-images-static';

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

interface Competition {
  sportKey: string;
  name: string;
  emoji: string;
}

const COMPETITIONS: Competition[] = [
  { sportKey: 'soccer_france_ligue_one', name: 'Ligue 1', emoji: '🇫🇷' },
  { sportKey: 'soccer_epl', name: 'Premier League', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { sportKey: 'soccer_spain_la_liga', name: 'La Liga', emoji: '🇪🇸' },
  { sportKey: 'soccer_italy_serie_a', name: 'Serie A', emoji: '🇮🇹' },
  { sportKey: 'soccer_germany_bundesliga', name: 'Bundesliga', emoji: '🇩🇪' },
  { sportKey: 'soccer_uefa_champs_league', name: 'Champions League', emoji: '⭐' },
  { sportKey: 'soccer_uefa_europa_league', name: 'Europa League', emoji: '🏆' },
  { sportKey: 'soccer_uefa_europa_conference_league', name: 'Europa Conference League', emoji: '🥉' },
];

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [SYNC] Starting match synchronization...');

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
      console.error('❌ [SYNC] ODDS_API_KEY not configured in environment');
      return createErrorResponse('API key not configured', 500);
    }

    console.log('✅ [SYNC] API key found:', apiKey.substring(0, 8) + '...');

    let totalSyncedCount = 0;
    let totalUpdatedCount = 0;
    let totalErrorCount = 0;
    let totalSkippedCount = 0;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    console.log(`📅 [SYNC] Date range: ${now.toISOString()} to ${thirtyDaysFromNow.toISOString()}`);

    for (const competition of COMPETITIONS) {
      try {
        const apiUrl = `https://api.the-odds-api.com/v4/sports/${competition.sportKey}/odds/?regions=eu&markets=h2h&apiKey=${apiKey}`;

        console.log(`🏆 [SYNC] Fetching ${competition.name}...`);
        console.log(`📡 [SYNC] API URL: ${apiUrl.replace(apiKey, 'HIDDEN')}`);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log(`📊 [SYNC] ${competition.name} response status:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [SYNC] Odds API error for ${competition.name}:`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          totalErrorCount++;
          continue;
        }

        const matches: OddsAPIMatch[] = await response.json();
        console.log(`✅ [SYNC] ${competition.name}: ${matches.length} matches found in API`);

        for (const match of matches) {
          try {
            const commenceTime = new Date(match.commence_time);

            if (commenceTime <= now) {
              console.log(`⏭️ [SYNC] Skipping past match: ${match.home_team} vs ${match.away_team} (${commenceTime.toISOString()})`);
              totalSkippedCount++;
              continue;
            }

            if (commenceTime > thirtyDaysFromNow) {
              console.log(`⏭️ [SYNC] Skipping far future match: ${match.home_team} vs ${match.away_team} (${commenceTime.toISOString()})`);
              totalSkippedCount++;
              continue;
            }

            console.log(`⚽ [SYNC] Processing: ${match.home_team} vs ${match.away_team}`);

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
                console.error('❌ [SYNC] Update error:', updateError);
                totalErrorCount++;
              } else {
                console.log(`🔄 [SYNC] Updated: ${match.home_team} vs ${match.away_team}`);
                totalUpdatedCount++;
              }
            } else {
              const teamAImages = getTeamImages(match.home_team);
              const teamBImages = getTeamImages(match.away_team);

              const { error: insertError } = await supabase
                .from('matches')
                .insert({
                  team_a: match.home_team,
                  team_b: match.away_team,
                  competition: competition.name,
                  odds_a: oddsA,
                  odds_draw: oddsDraw,
                  odds_b: oddsB,
                  status: 'upcoming',
                  match_date: commenceTime.toISOString(),
                  match_mode: 'real',
                  external_api_id: match.id,
                  api_provider: 'the-odds-api',
                  team_a_badge: teamAImages?.badge || null,
                  team_a_banner: teamAImages?.banner || null,
                  team_a_stadium: teamAImages?.stadium || null,
                  team_b_badge: teamBImages?.badge || null,
                  team_b_banner: teamBImages?.banner || null,
                  team_b_stadium: teamBImages?.stadium || null,
                });

              if (insertError) {
                console.error('❌ [SYNC] Insert error:', insertError);
                totalErrorCount++;
              } else {
                console.log(`✅ [SYNC] Inserted: ${match.home_team} vs ${match.away_team}`);
                totalSyncedCount++;
              }
            }
          } catch (err) {
            console.error('Error processing match:', err);
            totalErrorCount++;
          }
        }
      } catch (err) {
        console.error(`Error fetching ${competition.name}:`, err instanceof Error ? err.message : err);
        totalErrorCount++;
      }
    }

    console.log('🎉 [SYNC] ========== SYNC COMPLETE ==========');
    console.log(`📊 [SYNC] Stats:`);
    console.log(`   - ✨ New matches: ${totalSyncedCount}`);
    console.log(`   - 🔄 Updated: ${totalUpdatedCount}`);
    console.log(`   - ⏭️ Skipped: ${totalSkippedCount}`);
    console.log(`   - ❌ Errors: ${totalErrorCount}`);
    console.log('==========================================');

    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    console.log('🔄 [SYNC] Updating match statuses...');

    const { error: statusOngoingError } = await supabase
      .from('matches')
      .update({ status: 'ongoing' })
      .eq('match_mode', 'real')
      .eq('status', 'upcoming')
      .lte('match_date', now.toISOString())
      .gte('match_date', twoHoursAgo.toISOString());

    if (statusOngoingError) {
      console.error('Status update to ongoing error:', statusOngoingError);
    } else {
      console.log('✅ [SYNC] Updated matches to ongoing');
    }

    const { error: statusFinishedError } = await supabase
      .from('matches')
      .update({ status: 'finished' })
      .eq('match_mode', 'real')
      .in('status', ['upcoming', 'ongoing'])
      .lt('match_date', twoHoursAgo.toISOString());

    if (statusFinishedError) {
      console.error('Status update to finished error:', statusFinishedError);
    } else {
      console.log('✅ [SYNC] Updated matches to finished');
    }

    console.log('🗑️ [SYNC] Cleaning up old matches...');

    try {
      const { data: upcomingMatchesWithoutBets } = await supabase
        .from('matches')
        .select('id')
        .eq('match_mode', 'real')
        .eq('status', 'upcoming')
        .lt('match_date', now.toISOString());

      if (upcomingMatchesWithoutBets && upcomingMatchesWithoutBets.length > 0) {
        for (const match of upcomingMatchesWithoutBets) {
          const { count: betsCount } = await supabase
            .from('bets')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', match.id);

          if (betsCount === 0) {
            await supabase
              .from('matches')
              .delete()
              .eq('id', match.id);
          }
        }
      }

      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const { data: finishedMatches } = await supabase
        .from('matches')
        .select('id')
        .eq('match_mode', 'real')
        .eq('status', 'finished')
        .lt('match_date', oneDayAgo.toISOString());

      if (finishedMatches && finishedMatches.length > 0) {
        for (const match of finishedMatches) {
          const { count: pendingBets } = await supabase
            .from('bets')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .is('is_win', null);

          if (pendingBets === 0) {
            await supabase
              .from('matches')
              .delete()
              .eq('id', match.id);
          }
        }
      }

      const { error: deleteFutureError } = await supabase
        .from('matches')
        .delete()
        .eq('match_mode', 'real')
        .gt('match_date', thirtyDaysFromNow.toISOString());

      if (deleteFutureError) {
        console.error('Delete far future matches error:', deleteFutureError);
      } else {
        console.log('✅ [SYNC] Cleaned up far future matches');
      }
    } catch (err) {
      console.error('Delete old matches error:', err);
    }

    return createSuccessResponse({
      message: 'All competitions synchronized successfully',
      stats: {
        competitions: COMPETITIONS.length,
        synced: totalSyncedCount,
        updated: totalUpdatedCount,
        skipped: totalSkippedCount,
        errors: totalErrorCount,
      },
    });

  } catch (error: any) {
    console.error('❌ [SYNC] Fatal error:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
}
