import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Competition {
  sportKey: string;
  name: string;
  emoji: string;
  sportType: 'soccer' | 'nba' | 'nfl' | 'mma';
}

const COMPETITIONS: Competition[] = [
  // Football (Soccer)
  { sportKey: 'soccer_france_ligue_one', name: 'Ligue 1', emoji: '🇫🇷', sportType: 'soccer' },
  { sportKey: 'soccer_epl', name: 'Premier League', emoji: '🏴‍☠️', sportType: 'soccer' },
  { sportKey: 'soccer_spain_la_liga', name: 'La Liga', emoji: '🇪🇸', sportType: 'soccer' },
  { sportKey: 'soccer_italy_serie_a', name: 'Serie A', emoji: '🇮🇹', sportType: 'soccer' },
  { sportKey: 'soccer_germany_bundesliga', name: 'Bundesliga', emoji: '🇩🇪', sportType: 'soccer' },
  { sportKey: 'soccer_uefa_champs_league', name: 'Champions League', emoji: '⭐', sportType: 'soccer' },
  { sportKey: 'soccer_uefa_europa_league', name: 'Europa League', emoji: '🏆', sportType: 'soccer' },
  { sportKey: 'soccer_uefa_europa_conference_league', name: 'Europa Conference League', emoji: '🥉', sportType: 'soccer' },

  // Basketball NBA
  { sportKey: 'basketball_nba', name: 'NBA', emoji: '🏀', sportType: 'nba' },

  // Football Américain NFL
  { sportKey: 'americanfootball_nfl', name: 'NFL', emoji: '🏈', sportType: 'nfl' },

  // MMA
  { sportKey: 'mma_mixed_martial_arts', name: 'UFC', emoji: '🥊', sportType: 'mma' },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('🌀 [SYNC] Starting optimized match synchronization...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const oddsApiKey = Deno.env.get('ODDS_API_KEY');

    console.log('🔑 [SYNC] Checking API key...');
    if (!oddsApiKey) {
      console.error('❌ [SYNC] ODDS_API_KEY not configured');
      throw new Error('ODDS_API_KEY not configured');
    }

    console.log('✅ [SYNC] API key found:', oddsApiKey.substring(0, 8) + '...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    console.log('📊 [SYNC] Step 1: Update match statuses based on time');

    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('match_mode', 'real')
      .eq('status', 'upcoming')
      .lte('match_date', now.toISOString())
      .gte('match_date', twoHoursAgo.toISOString());

    await supabase
      .from('matches')
      .update({ status: 'finished' })
      .eq('match_mode', 'real')
      .in('status', ['upcoming', 'live'])
      .lt('match_date', twoHoursAgo.toISOString());

    console.log('✅ [SYNC] Match statuses updated');

    // Step 1.5: Check if we need to fetch new matches (throttle to reduce API calls)
    console.log('🔍 [SYNC] Step 1.5: Checking if new matches fetch is needed...');

    const { data: configData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'last_matches_fetch')
      .maybeSingle();

    const lastFetchTime = configData?.value ? new Date(configData.value).getTime() : 0;
    const currentTime = now.getTime();
    const FETCH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

    let newMatchesInserted = 0;
    let matchesUpdated = 0;
    let apiCallsForMatches = 0;

    if (currentTime - lastFetchTime < FETCH_INTERVAL_MS) {
      const minutesSinceLastFetch = Math.floor((currentTime - lastFetchTime) / 60000);
      console.log(`⏭️ [SYNC] Skipping new matches fetch (last fetch: ${minutesSinceLastFetch} min ago, threshold: 30 min)`);
    } else {
      console.log('🆕 [SYNC] Fetching new upcoming matches from API...');

      for (const competition of COMPETITIONS) {
      try {
        const oddsUrl = `https://api.the-odds-api.com/v4/sports/${competition.sportKey}/odds/?regions=eu&markets=h2h&apiKey=${oddsApiKey}`;

        console.log(`🔍 [SYNC] Fetching matches for ${competition.name}...`);
        apiCallsForMatches++;

        const oddsResponse = await fetch(oddsUrl);

        if (!oddsResponse.ok) {
          console.error(`❌ [SYNC] Odds API error for ${competition.name}:`, oddsResponse.status);
          continue;
        }

        const oddsData = await oddsResponse.json();

        if (!oddsData || oddsData.length === 0) {
          console.log(`📭 [SYNC] No upcoming matches for ${competition.name}`);
          continue;
        }

        console.log(`📊 [SYNC] Found ${oddsData.length} matches for ${competition.name}`);

        for (const match of oddsData) {
          const matchDate = new Date(match.commence_time);

          // Only insert future matches
          if (matchDate <= now) {
            continue;
          }

          // Get odds from bookmakers
          let oddsA = 2.0, oddsDraw = 3.0, oddsB = 2.0;

          if (match.bookmakers && match.bookmakers.length > 0) {
            const bookmaker = match.bookmakers[0];
            const h2hMarket = bookmaker.markets?.find((m: any) => m.key === 'h2h');

            if (h2hMarket && h2hMarket.outcomes) {
              const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === match.home_team);
              const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === match.away_team);
              const drawOutcome = h2hMarket.outcomes.find((o: any) => o.name === 'Draw');

              if (homeOutcome) oddsA = homeOutcome.price;
              if (awayOutcome) oddsB = awayOutcome.price;
              if (drawOutcome) oddsDraw = drawOutcome.price;
            }
          }

          // Check if match already exists
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id')
            .eq('external_api_id', match.id)
            .maybeSingle();

          if (existingMatch) {
            // Update existing match
            const { error: updateError } = await supabase
              .from('matches')
              .update({
                odds_a: oddsA,
                odds_draw: oddsDraw,
                odds_b: oddsB,
                match_date: matchDate.toISOString(),
                status: 'upcoming'
              })
              .eq('id', existingMatch.id);

            if (!updateError) {
              matchesUpdated++;
              console.log(`🔄 [SYNC] Updated: ${match.home_team} vs ${match.away_team}`);
            }
          } else {
            // Insert new match
            const { error: insertError } = await supabase
              .from('matches')
              .insert({
                external_api_id: match.id,
                team_a: match.home_team,
                team_b: match.away_team,
                odds_a: oddsA,
                odds_draw: oddsDraw,
                odds_b: oddsB,
                match_date: matchDate.toISOString(),
                competition: competition.name,
                status: 'upcoming',
                match_mode: 'real',
                sport_type: competition.sportType
              });

            if (!insertError) {
              newMatchesInserted++;
              console.log(`✅ [SYNC] Inserted: ${match.home_team} vs ${match.away_team}`);
            } else {
              console.error(`❌ [SYNC] Insert error:`, insertError);
            }
          }
        }
      } catch (err) {
        console.error(`❌ [SYNC] Error fetching matches for ${competition.name}:`, err);
      }
    }

      console.log(`✅ [SYNC] New matches: ${newMatchesInserted}, Updated: ${matchesUpdated}, API calls: ${apiCallsForMatches}`);

      // Update last fetch timestamp
      await supabase
        .from('system_config')
        .upsert({
          key: 'last_matches_fetch',
          value: now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'key'
        });

      console.log('✅ [SYNC] Updated last_matches_fetch timestamp');
    }

    console.log('🎯 [SYNC] Step 2: Check for finished matches without results');

    const { data: finishedMatches, error: fetchError } = await supabase
      .from('matches')
      .select('id, external_api_id, competition, team_a, team_b')
      .eq('match_mode', 'real')
      .eq('status', 'finished')
      .is('result', null)
      .not('external_api_id', 'is', null);

    if (fetchError) {
      console.error('❌ [SYNC] Error fetching finished matches:', fetchError);
      throw fetchError;
    }

    if (!finishedMatches || finishedMatches.length === 0) {
      console.log('✅ [SYNC] No finished matches without results, skipping score API calls');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Match synchronization completed successfully',
          stats: {
            newMatches: newMatchesInserted,
            matchesUpdated: matchesUpdated,
            scoresUpdated: 0,
            scoresErrors: 0,
            apiCallsMade: apiCallsForMatches,
          },
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`📊 [SYNC] Found ${finishedMatches.length} matches needing scores`);

    const leaguesNeeded = Array.from(
      new Set(finishedMatches.map(m => m.competition).filter(Boolean))
    );

    console.log(`🏆 [SYNC] Leagues to fetch: ${leaguesNeeded.join(', ')}`);

    let scoresUpdated = 0;
    let scoresErrors = 0;
    let apiCallsMade = 0;

    for (const leagueName of leaguesNeeded) {
      const competition = COMPETITIONS.find(c => c.name === leagueName);
      if (!competition) {
        console.log(`⚠️ [SYNC] No sport key found for league: ${leagueName}`);
        continue;
      }

      try {
        const scoresUrl = `https://api.the-odds-api.com/v4/sports/${competition.sportKey}/scores/?apiKey=${oddsApiKey}&daysFrom=3`;

        console.log(`🔍 [SYNC] Fetching scores for ${competition.name}...`);
        apiCallsMade++;

        const scoresResponse = await fetch(scoresUrl);

        if (!scoresResponse.ok) {
          console.error(`❌ [SYNC] Scores API error for ${competition.name}:`, scoresResponse.status);
          scoresErrors++;
          continue;
        }

        const scoresData = await scoresResponse.json();

        if (!scoresData || scoresData.length === 0) {
          console.log(`📭 [SYNC] No scores data for ${competition.name}`);
          continue;
        }

        const matchesForThisLeague = finishedMatches.filter(m => m.competition === leagueName);

        for (const matchInDb of matchesForThisLeague) {
          const scoreData = scoresData.find((s: any) => s.id === matchInDb.external_api_id);

          if (!scoreData) {
            continue;
          }

          if (!scoreData.completed || !scoreData.scores) {
            console.log(`⏳ [SYNC] Match ${matchInDb.external_api_id} not completed yet`);
            continue;
          }

          const homeScoreObj = scoreData.scores.find((s: any) => s.name === scoreData.home_team);
          const awayScoreObj = scoreData.scores.find((s: any) => s.name === scoreData.away_team);

          if (!homeScoreObj || !awayScoreObj) {
            console.error(`❌ [SYNC] Could not find scores for ${scoreData.home_team} vs ${scoreData.away_team}`);
            scoresErrors++;
            continue;
          }

          const apiHomeScore = parseInt(homeScoreObj.score);
          const apiAwayScore = parseInt(awayScoreObj.score);

          let scoreHome, scoreAway, result;

          if (matchInDb.team_a === scoreData.home_team) {
            scoreHome = apiHomeScore;
            scoreAway = apiAwayScore;
          } else {
            scoreHome = apiAwayScore;
            scoreAway = apiHomeScore;
          }

          if (scoreHome > scoreAway) {
            result = 'A';
          } else if (scoreAway > scoreHome) {
            result = 'B';
          } else {
            result = 'Draw';
          }

          const { error: updateError } = await supabase
            .from('matches')
            .update({
              score_home: scoreHome,
              score_away: scoreAway,
              result,
              status: 'finished'
            })
            .eq('id', matchInDb.id);

          if (updateError) {
            console.error(`❌ [SYNC] Failed to update match ${matchInDb.id}:`, updateError);
            scoresErrors++;
          } else {
            console.log(`✅ [SYNC] Updated ${matchInDb.team_a} ${scoreHome}-${scoreAway} ${matchInDb.team_b}: ${result}`);
            scoresUpdated++;
          }
        }
      } catch (err) {
        console.error(`❌ [SYNC] Error fetching scores for ${competition.name}:`, err);
        scoresErrors++;
      }
    }

    console.log(`🎉 [SYNC] Complete - ${newMatchesInserted} new matches, ${matchesUpdated} updated, ${scoresUpdated} scores updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Match synchronization completed successfully',
        stats: {
          newMatches: newMatchesInserted,
          matchesUpdated: matchesUpdated,
          scoresUpdated,
          scoresErrors,
          apiCallsMade: apiCallsMade + apiCallsForMatches,
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
    console.error('❌ [SYNC] Fatal sync error:', error);
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
