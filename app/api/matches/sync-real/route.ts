import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';
import { fetchTeamImages } from '@/lib/team-images';

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

    let totalSyncedCount = 0;
    let totalUpdatedCount = 0;
    let totalErrorCount = 0;
    let totalSkippedCount = 0;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const competition of COMPETITIONS) {
      try {
        const apiUrl = `https://api.the-odds-api.com/v4/sports/${competition.sportKey}/odds/?regions=eu&markets=h2h&apiKey=${apiKey}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
          console.error(`Odds API error for ${competition.name}:`, response.statusText);
          continue;
        }

        const matches: OddsAPIMatch[] = await response.json();

        for (const match of matches) {
          try {
            const commenceTime = new Date(match.commence_time);

            if (commenceTime <= now || commenceTime > sevenDaysFromNow) {
              totalSkippedCount++;
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
                totalErrorCount++;
              } else {
                totalUpdatedCount++;
              }
            } else {
              const [teamAImages, teamBImages] = await Promise.all([
                fetchTeamImages(match.home_team),
                fetchTeamImages(match.away_team),
              ]);

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
                  team_a_badge: teamAImages.badge,
                  team_a_banner: teamAImages.banner,
                  team_a_stadium: teamAImages.stadium,
                  team_b_badge: teamBImages.badge,
                  team_b_banner: teamBImages.banner,
                  team_b_stadium: teamBImages.stadium,
                });

              if (insertError) {
                console.error('Insert error:', insertError);
                totalErrorCount++;
              } else {
                totalSyncedCount++;
              }
            }
          } catch (err) {
            console.error('Error processing match:', err);
            totalErrorCount++;
          }
        }
      } catch (err) {
        console.error(`Error fetching ${competition.name}:`, err);
        totalErrorCount++;
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
    console.error('Sync error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
