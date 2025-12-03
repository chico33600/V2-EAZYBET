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

    const nowUtc = new Date().toISOString();
    console.log("🕐 [RESOLVE-BETS] Current UTC time:", nowUtc);

    // STEP 1: Update match statuses based on NEW LOGIC
    // Rule: if now < match_date → upcoming
    //       if match_date <= now < end_time → live
    //       if now >= end_time → finished

    console.log("🔄 [RESOLVE-BETS] Updating match statuses...");

    // Update to LIVE: matches where match_date <= now AND end_time > now
    const updateToLiveResponse = await fetch(
      `${supabaseUrl}/rest/v1/matches?status=eq.upcoming&match_date=lte.${nowUtc}&end_time=gt.${nowUtc}`,
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

    if (updateToLiveResponse.ok) {
      const liveMatches = await updateToLiveResponse.json();
      console.log(`✅ [RESOLVE-BETS] Updated ${liveMatches.length} matches to LIVE status`);
    } else {
      console.error("❌ [RESOLVE-BETS] Failed to update matches to live:", await updateToLiveResponse.text());
    }

    // Update to FINISHED: matches where end_time <= now
    const updateToFinishedResponse = await fetch(
      `${supabaseUrl}/rest/v1/matches?status=in.(upcoming,live)&end_time=lte.${nowUtc}`,
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

    if (updateToFinishedResponse.ok) {
      const finishedMatches = await updateToFinishedResponse.json();
      console.log(`✅ [RESOLVE-BETS] Updated ${finishedMatches.length} matches to FINISHED status`);
    } else {
      console.error("❌ [RESOLVE-BETS] Failed to update matches to finished:", await updateToFinishedResponse.text());
    }

    // STEP 2: Resolve simple bets for finished matches with results
    console.log("🎲 [RESOLVE-BETS] Resolving simple bets...");

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
    console.log(`📊 [RESOLVE-BETS] Found ${finishedMatches.length} finished matches with results`);

    let resolved = 0;
    let failed = 0;

    // Process each match INDEPENDENTLY (no blocking)
    for (const match of finishedMatches) {
      try {
        console.log(`🔍 [RESOLVE-BETS] Processing match ${match.id}: ${match.team_a} vs ${match.team_b}`);

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
          continue; // Continue to next match
        }

        const bets = await betsResponse.json();

        if (bets.length === 0) {
          console.log(`ℹ️ [RESOLVE-BETS] No unresolved bets for match ${match.id}`);
          continue;
        }

        console.log(`🎲 [RESOLVE-BETS] Resolving ${bets.length} bets for match ${match.id}`);

        // Process each bet independently
        for (const bet of bets) {
          try {
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

              // Update profile
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

              // Update bet with resolved_at
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
                    resolved_at: nowUtc,
                  }),
                }
              );

              console.log(`✅ [RESOLVE-BETS] Bet ${bet.id} won - credited ${tokensRewarded} tokens, ${diamondsRewarded} diamonds`);
            } else {
              // Update bet as lost with resolved_at
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
                    resolved_at: nowUtc,
                  }),
                }
              );

              console.log(`❌ [RESOLVE-BETS] Bet ${bet.id} lost`);
            }

            resolved++;
          } catch (betError) {
            console.error(`❌ [RESOLVE-BETS] Error resolving bet ${bet.id}:`, betError);
            failed++;
          }
        }
      } catch (matchError) {
        console.error(`❌ [RESOLVE-BETS] Error processing match ${match.id}:`, matchError);
        failed++;
        // Continue to next match - don't let one match block others
      }
    }

    console.log(`🎉 [RESOLVE-BETS] Simple bets resolution complete - ${resolved} bets resolved, ${failed} failed`);

    // STEP 3: Resolve combo bets
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

      // Process each combo bet independently
      for (const comboBet of comboBets) {
        try {
          const selections = comboBet.combo_bet_selections || [];

          // Check if all matches are finished with results
          const allFinished = selections.every(
            (sel: any) => sel.matches && sel.matches.status === 'finished' && sel.matches.result
          );

          if (!allFinished) {
            // Skip - not all matches are finished yet
            continue;
          }

          // Check if all selections are winners
          const allWon = selections.every(
            (sel: any) => sel.matches && sel.choice === sel.matches.result
          );

          let tokensRewarded = 0;
          let diamondsRewarded = 0;

          if (allWon) {
            // Calculate winnings
            if (comboBet.bet_currency === 'diamonds') {
              diamondsRewarded = Math.floor(comboBet.amount * comboBet.total_odds);
            } else {
              tokensRewarded = Math.floor(comboBet.amount * comboBet.total_odds);
              const profit = tokensRewarded - comboBet.amount;
              diamondsRewarded = Math.floor(profit * 0.01);
            }

            // Fetch profile
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

                // Credit winnings
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

          // Update combo bet with resolved_at
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
                resolved_at: nowUtc,
              }),
            }
          );

          console.log(`${allWon ? '✅' : '❌'} [RESOLVE-BETS] Combo bet ${comboBet.id} ${allWon ? 'won' : 'lost'}`);
          comboResolved++;
        } catch (comboError) {
          console.error(`❌ [RESOLVE-BETS] Error resolving combo bet ${comboBet.id}:`, comboError);
          comboFailed++;
          // Continue to next combo bet
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