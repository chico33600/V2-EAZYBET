import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

const LEAGUES_CONFIG = [
  { key: 'soccer_epl', name: 'Premier League', country: 'England' },
  { key: 'soccer_spain_la_liga', name: 'La Liga', country: 'Spain' },
  { key: 'soccer_italy_serie_a', name: 'Serie A', country: 'Italy' },
  { key: 'soccer_germany_bundesliga', name: 'Bundesliga', country: 'Germany' },
  { key: 'soccer_france_ligue_one', name: 'Ligue 1', country: 'France' },
  { key: 'soccer_uefa_champs_league', name: 'UEFA Champions League', country: 'Europe' },
  { key: 'soccer_uefa_europa_league', name: 'UEFA Europa League', country: 'Europe' },
  { key: 'soccer_uefa_europa_conference_league', name: 'UEFA Europa Conference League', country: 'Europe' },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const oddsApiKey = Deno.env.get('ODDS_API_KEY');
    
    if (!oddsApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ODDS_API_KEY not configured',
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const allMatches: any[] = [];

    for (const league of LEAGUES_CONFIG) {
      try {
        const url = `${ODDS_API_BASE_URL}/sports/${league.key}/odds/?apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;

        console.log(`Fetching ${league.name}...`);

        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Error fetching ${league.name}: ${response.status}`);
          continue;
        }

        const matches = await response.json();

        console.log(`Found ${matches.length} matches for ${league.name}`);

        for (const match of matches) {
          const bookmaker = match.bookmakers?.[0];
          const h2hMarket = bookmaker?.markets?.find((m: any) => m.key === 'h2h');

          if (!h2hMarket || !h2hMarket.outcomes || h2hMarket.outcomes.length < 2) {
            continue;
          }

          const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === match.home_team);
          const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === match.away_team);
          const drawOutcome = h2hMarket.outcomes.find((o: any) => o.name === 'Draw');

          if (!homeOutcome || !awayOutcome) {
            continue;
          }

          allMatches.push({
            external_id: match.id,
            team_home: match.home_team,
            team_away: match.away_team,
            competition: league.name,
            odd_home: homeOutcome.price || 2.0,
            odd_draw: drawOutcome?.price || 3.0,
            odd_away: awayOutcome.price || 2.0,
            start_time: match.commence_time,
            status: 'UPCOMING',
            team_home_image: '',
            team_away_image: '',
          });
        }
      } catch (error) {
        console.error(`Error processing ${league.name}:`, error);
      }
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const match of allMatches) {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .eq('external_id', match.external_id)
        .maybeSingle();

      if (existingMatch) {
        await supabase
          .from('matches')
          .update({
            odd_home: match.odd_home,
            odd_draw: match.odd_draw,
            odd_away: match.odd_away,
            updated_at: new Date().toISOString(),
          })
          .eq('external_id', match.external_id);
        updatedCount++;
      } else {
        await supabase
          .from('matches')
          .insert(match);
        insertedCount++;
      }
    }

    await supabase
      .from('system_logs')
      .insert({
        type: 'odds_api_sync_cron',
        payload: {
          total: allMatches.length,
          inserted: insertedCount,
          updated: updatedCount,
        },
      });

    console.log(`Sync complete: ${insertedCount} inserted, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Matches synced successfully',
        total: allMatches.length,
        inserted: insertedCount,
        updated: updatedCount,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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