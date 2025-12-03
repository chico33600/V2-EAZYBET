import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🎯 [RESOLVE-BETS] Starting bet resolution...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ [RESOLVE-BETS] Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    console.log("🔄 [RESOLVE-BETS] Calling sync-matches to fetch scores...");
    try {
      const syncResponse = await fetch(
        `${supabaseUrl}/functions/v1/sync-matches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
        }
      );

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log(`✅ [RESOLVE-BETS] Sync complete - ${syncData.stats?.scoresUpdated || 0} scores updated`);
      } else {
        console.error("❌ [RESOLVE-BETS] Sync-matches failed:", syncResponse.status);
      }
    } catch (syncError) {
      console.error("❌ [RESOLVE-BETS] Failed to call sync-matches:", syncError);
    }

    console.log("🔄 [RESOLVE-BETS] Updating match statuses...");

    const updateStatusLiveResponse = await fetch(
      `${supabaseUrl}/rest/v1/matches?match_mode=eq.real&status=eq.upcoming&match_date=lte.${now.toISOString()}&match_date=gte.${twoHoursAgo.toISOString()}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ status: "live" }),
      }
    );

    if (!updateStatusLiveResponse.ok) {
      console.error("❌ [RESOLVE-BETS] Failed to update match status to live");
    } else {
      console.log("✅ [RESOLVE-BETS] Updated match statuses to live");
    }

    const updateStatusFinishedResponse = await fetch(
      `${supabaseUrl}/rest/v1/matches?match_mode=eq.real&status=in.(upcoming,live)&match_date=lt.${twoHoursAgo.toISOString()}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ status: "finished" }),
      }
    );

    if (!updateStatusFinishedResponse.ok) {
      console.error("❌ [RESOLVE-BETS] Failed to update match status to finished");
    } else {
      console.log("✅ [RESOLVE-BETS] Updated match statuses to finished");
    }

    const finishedMatchesResponse = await fetch(
      `${supabaseUrl}/rest/v1/matches?select=*&status=eq.finished&result=not.is.null`,
      {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!finishedMatchesResponse.ok) {
      throw new Error("Failed to fetch finished matches");
    }

    const finishedMatches = await finishedMatchesResponse.json();
    console.log(`📊 [RESOLVE-BETS] Found ${finishedMatches.length} finished matches`);

    let resolved = 0;
    let failed = 0;

    for (const match of finishedMatches) {
      try {
        const betsResponse = await fetch(
          `${supabaseUrl}/rest/v1/bets?select=*,profiles!inner(id,tokens,diamonds,won_bets)&match_id=eq.${match.id}&is_win=is.null`,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (!betsResponse.ok) {
          console.error(`❌ [RESOLVE-BETS] Failed to fetch bets for match ${match.id}`);
          failed++;
          continue;
        }

        const bets = await betsResponse.json();

        if (bets.length === 0) {
          continue;
        }

        console.log(`🎲 [RESOLVE-BETS] Resolving ${bets.length} bets for match ${match.id}`);

        for (const bet of bets) {
          const isWin = bet.choice === match.result;

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

            await fetch(
              `${supabaseUrl}/rest/v1/profiles?id=eq.${bet.user_id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseAnonKey,
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  tokens: bet.profiles.tokens + tokensRewarded,
                  diamonds: bet.profiles.diamonds + diamondsRewarded,
                  won_bets: bet.profiles.won_bets + 1,
                }),
              }
            );

            await fetch(
              `${supabaseUrl}/rest/v1/bets?id=eq.${bet.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseAnonKey,
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  is_win: true,
                  tokens_won: tokensRewarded,
                  diamonds_won: diamondsRewarded,
                  tokens_rewarded: tokensRewarded,
                  diamonds_rewarded: diamondsRewarded,
                }),
              }
            );

            console.log(`✅ [RESOLVE-BETS] Bet ${bet.id} won - credited ${tokensRewarded} tokens, ${diamondsRewarded} diamonds`);
          } else {
            await fetch(
              `${supabaseUrl}/rest/v1/bets?id=eq.${bet.id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": supabaseAnonKey,
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  is_win: false,
                  tokens_won: 0,
                  diamonds_won: 0,
                  tokens_rewarded: 0,
                  diamonds_rewarded: 0,
                }),
              }
            );

            console.log(`❌ [RESOLVE-BETS] Bet ${bet.id} lost`);
          }

          resolved++;
        }
      } catch (err) {
        console.error(`❌ [RESOLVE-BETS] Error resolving match ${match.id}:`, err);
        failed++;
      }
    }

    console.log(`🎉 [RESOLVE-BETS] Simple bets resolution complete - ${resolved} bets resolved, ${failed} failed`);

    console.log("🎯 [RESOLVE-BETS] Starting combo bets resolution...");

    let comboResolved = 0;
    let comboFailed = 0;

    const comboBetsResponse = await fetch(
      `${supabaseUrl}/rest/v1/combo_bets?select=*,combo_bet_selections(match_id,choice,matches!inner(id,status,result))&is_win=is.null`,
      {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (comboBetsResponse.ok) {
      const comboBets = await comboBetsResponse.json();
      console.log(`📊 [RESOLVE-BETS] Found ${comboBets.length} unresolved combo bets`);

      for (const comboBet of comboBets) {
        try {
          const selections = comboBet.combo_bet_selections || [];

          const allFinished = selections.every(
            (sel: any) => sel.matches && sel.matches.status === 'finished' && sel.matches.result
          );

          if (!allFinished) {
            continue;
          }

          const allWon = selections.every(
            (sel: any) => sel.matches && sel.choice === sel.matches.result
          );

          let tokensRewarded = 0;
          let diamondsRewarded = 0;

          if (allWon) {
            if (comboBet.bet_currency === 'diamonds') {
              diamondsRewarded = Math.floor(comboBet.amount * comboBet.total_odds);
            } else {
              tokensRewarded = Math.floor(comboBet.amount * comboBet.total_odds);
              const profit = tokensRewarded - comboBet.amount;
              diamondsRewarded = Math.floor(profit * 0.01);
            }

            const profileResponse = await fetch(
              `${supabaseUrl}/rest/v1/profiles?select=tokens,diamonds,won_bets&id=eq.${comboBet.user_id}`,
              {
                headers: {
                  "apikey": supabaseAnonKey,
                  "Authorization": `Bearer ${supabaseAnonKey}`,
                },
              }
            );

            if (profileResponse.ok) {
              const profiles = await profileResponse.json();
              if (profiles && profiles.length > 0) {
                const profile = profiles[0];

                await fetch(
                  `${supabaseUrl}/rest/v1/profiles?id=eq.${comboBet.user_id}`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      "apikey": supabaseAnonKey,
                      "Authorization": `Bearer ${supabaseAnonKey}`,
                    },
                    body: JSON.stringify({
                      tokens: profile.tokens + tokensRewarded,
                      diamonds: profile.diamonds + diamondsRewarded,
                      won_bets: profile.won_bets + 1,
                    }),
                  }
                );
              }
            }
          }

          await fetch(
            `${supabaseUrl}/rest/v1/combo_bets?id=eq.${comboBet.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseAnonKey,
                "Authorization": `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                is_win: allWon,
                tokens_won: tokensRewarded,
                diamonds_won: diamondsRewarded,
              }),
            }
          );

          console.log(`${allWon ? '✅' : '❌'} [RESOLVE-BETS] Combo bet ${comboBet.id} ${allWon ? 'won' : 'lost'}`);
          comboResolved++;
        } catch (err) {
          console.error(`❌ [RESOLVE-BETS] Error resolving combo bet ${comboBet.id}:`, err);
          comboFailed++;
        }
      }
    }

    console.log(`🎉 [RESOLVE-BETS] Combo bets resolution complete - ${comboResolved} resolved, ${comboFailed} failed`);

    const data = {
      ok: true,
      resolved,
      comboResolved,
      failed,
      comboFailed,
      message: `Resolved ${resolved} simple bets and ${comboResolved} combo bets, ${failed + comboFailed} failures`,
    };

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("❌ [RESOLVE-BETS] Fatal error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        ok: false,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});