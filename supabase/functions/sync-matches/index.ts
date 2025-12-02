import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🌀 [EDGE] Starting match synchronization...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const oddsApiKey = Deno.env.get('ODDS_API_KEY');

    console.log('🔑 [EDGE] Checking API key...');
    if (!oddsApiKey) {
      console.error('❌ [EDGE] ODDS_API_KEY not configured');
      throw new Error('ODDS_API_KEY not configured');
    }

    console.log('✅ [EDGE] API key found:', oddsApiKey.substring(0, 8) + '...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let totalSyncedCount = 0;
    let totalUpdatedCount = 0;
    let totalErrorCount = 0;
    let totalSkippedCount = 0;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    console.log(`📅 [EDGE] Date range: ${now.toISOString()} to ${sevenDaysFromNow.toISOString()}`);

    for (const competition of COMPETITIONS) {
      try {
        const apiUrl = `https://api.the-odds-api.com/v4/sports/${competition.sportKey}/odds/?regions=eu&markets=h2h&apiKey=${oddsApiKey}`;

        console.log(`🏆 [EDGE] Fetching ${competition.name}...`);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        console.log(`📡 [EDGE] ${competition.name} response status:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [EDGE] Odds API error for ${competition.name}:`, response.status, errorText.substring(0, 200));
          totalErrorCount++;
          continue;
        }

        const matches: OddsAPIMatch[] = await response.json();
        console.log(`✅ [EDGE] ${competition.name}: ${matches.length} matches found in API`);

        for (const match of matches) {
          try {
            const commenceTime = new Date(match.commence_time);

            if (commenceTime <= now) {
              totalSkippedCount++;
              continue;
            }

            if (commenceTime > sevenDaysFromNow) {
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
                console.error('❌ [EDGE] Update error:', updateError);
                totalErrorCount++;
              } else {
                totalUpdatedCount++;
              }
            } else {
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
                });

              if (insertError) {
                console.error('❌ [EDGE] Insert error:', insertError);
                totalErrorCount++;
              } else {
                totalSyncedCount++;
              }
            }
          } catch (err) {
            console.error('❌ [EDGE] Error processing match:', err);
            totalErrorCount++;
          }
        }
      } catch (err) {
        console.error(`❌ [EDGE] Error fetching ${competition.name}:`, err instanceof Error ? err.message : err);
        totalErrorCount++;
      }
    }

    console.log('🎉 [EDGE] ========== SYNC COMPLETE ==========');
    console.log(`📊 [EDGE] Stats:`);
    console.log(`   - ✨ New matches: ${totalSyncedCount}`);
    console.log(`   - 🔄 Updated: ${totalUpdatedCount}`);
    console.log(`   - ⏭️ Skipped: ${totalSkippedCount}`);
    console.log(`   - ❌ Errors: ${totalErrorCount}`);
    console.log('==========================================');

    // Mise à jour des statuts des matchs
    const { error: statusUpdateError } = await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('match_mode', 'real')
      .eq('status', 'upcoming')
      .lte('match_date', now.toISOString());

    if (statusUpdateError) {
      console.error('❌ [EDGE] Status update error:', statusUpdateError);
    }

    // Suppression UNIQUEMENT des matchs futurs sans paris
    const { data: matchesToDelete } = await supabase
      .from('matches')
      .select('id')
      .eq('match_mode', 'real')
      .gt('match_date', sevenDaysFromNow.toISOString());

    if (matchesToDelete && matchesToDelete.length > 0) {
      for (const match of matchesToDelete) {
        const { data: bets } = await supabase
          .from('bets')
          .select('id')
          .eq('match_id', match.id)
          .limit(1);

        if (!bets || bets.length === 0) {
          await supabase
            .from('matches')
            .delete()
            .eq('id', match.id);
        }
      }
    }

    console.log('✅ [EDGE] Match cleanup completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All competitions synchronized successfully',
        stats: {
          competitions: COMPETITIONS.length,
          synced: totalSyncedCount,
          updated: totalUpdatedCount,
          skipped: totalSkippedCount,
          errors: totalErrorCount,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ [EDGE] Fatal sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});