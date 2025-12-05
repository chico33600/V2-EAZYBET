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
}

const COMPETITIONS: Competition[] = [
  { sportKey: 'soccer_france_ligue_one', name: 'Ligue 1', emoji: '🇫🇷' },
  { sportKey: 'soccer_epl', name: 'Premier League', emoji: '🏴‍☠️' },
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
      console.log('✅ [SYNC] No finished matches without results, skipping API calls');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No matches to update',
          stats: {
            scoresUpdated: 0,
            scoresErrors: 0,
            apiCallsMade: 0,
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

    console.log(`🎉 [SYNC] Complete - ${scoresUpdated} scores updated, ${apiCallsMade} API calls made`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Match synchronization complete',
        stats: {
          scoresUpdated,
          scoresErrors,
          apiCallsMade,
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
