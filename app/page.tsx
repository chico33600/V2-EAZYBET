'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TabsMatchs } from '@/components/tabs-matchs';
import { LeagueSection } from '@/components/league-section';
import { BetSlip } from '@/components/bet-slip';
import { useAuth } from '@/lib/auth-context';
import { fetchMatches, fetchAvailableMatches, getUserBets } from '@/lib/api-client';
import type { Match } from '@/lib/supabase-client';
import { useNavigationStore, useBadgeStore, useTutorialStore } from '@/lib/store';
import { ActiveBetCard } from '@/components/active-bet-card';
import { FinishedBetCard } from '@/components/finished-bet-card';
import { ActiveComboBetCard } from '@/components/active-combo-bet-card';
import { FinishedComboBetCard } from '@/components/finished-combo-bet-card';
import { TutorialModal } from '@/components/tutorial-modal';
import { PromoBanner } from '@/components/promo-banner';
import { supabase } from '@/lib/supabase-client';

export default function Home() {
  const { activeHomeTab: activeTab, setActiveHomeTab: setActiveTab } = useNavigationStore();
  const { hasNewBet, setHasNewBet } = useBadgeStore();
  const { showTutorial, setShowTutorial } = useTutorialStore();
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeBets, setActiveBets] = useState<any[]>([]);
  const [finishedBets, setFinishedBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (profile && !profile.has_seen_tutorial) {
      setShowTutorial(true);
    }
  }, [profile, setShowTutorial]);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token available');
        return;
      }

      const response = await fetch('/api/user/complete-tutorial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to complete tutorial');
      }
    } catch (error) {
      console.error('Tutorial completion error:', error);
    }
  };


  // Fonction pour mettre à jour les statuts des matchs (NOUVELLE LOGIQUE)
  const updateMatchStatuses = async () => {
    const nowUtc = new Date().toISOString();
    console.log('[Home] 🔄 Updating match statuses at UTC:', nowUtc);

    // NOUVELLE LOGIQUE:
    // upcoming: now < match_date
    // live: match_date <= now < end_time
    // finished: now >= end_time

    // Mettre à jour les matchs en "live": match_date <= now AND end_time > now
    const { data: liveUpdated, error: liveError } = await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .lte('match_date', nowUtc)
      .gt('end_time', nowUtc)
      .select();

    if (liveError) {
      console.error('[Home] ❌ Error updating to live:', liveError);
    } else {
      console.log(`[Home] ✅ Updated ${liveUpdated?.length || 0} matches to LIVE status`);
    }

    // Mettre à jour les matchs en "finished": end_time <= now
    const { data: finishedUpdated, error: finishedError } = await supabase
      .from('matches')
      .update({ status: 'finished' })
      .in('status', ['upcoming', 'live'])
      .lte('end_time', nowUtc)
      .select();

    if (finishedError) {
      console.error('[Home] ❌ Error updating to finished:', finishedError);
    } else {
      console.log(`[Home] ✅ Updated ${finishedUpdated?.length || 0} matches to FINISHED status`);
    }
  };

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      await updateMatchStatuses();
      const data = await fetchAvailableMatches('real');
      setMatches(data);
      setLoading(false);
    }

    async function loadActiveBets() {
      setLoading(true);
      await updateMatchStatuses();
      const data = await getUserBets('active');
      setActiveBets(data);
      setLoading(false);
    }

    async function loadFinishedBets() {
      setLoading(true);
      await updateMatchStatuses();
      const data = await getUserBets('history');
      setFinishedBets(data);
      setLoading(false);
    }

    if (user && activeTab === 'upcoming') {
      loadMatches();
    } else if (user && activeTab === 'played') {
      loadActiveBets();
    } else if (user && activeTab === 'finished') {
      loadFinishedBets();
    } else if (user) {
      setMatches([]);
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    const handleBetPlaced = async () => {
      setHasNewBet(true);

      if (activeTab === 'upcoming') {
        await updateMatchStatuses();
        const data = await fetchAvailableMatches('real');
        setMatches(data);
      } else if (activeTab === 'played') {
        await updateMatchStatuses();
        const data = await getUserBets('active');
        setActiveBets(data);
      }
    };

    const handleMatchesSynced = async () => {
      console.log('[Home] Matches synced event received!');
      if (activeTab === 'upcoming') {
        await updateMatchStatuses();
        const data = await fetchAvailableMatches('real');
        setMatches(data);
        console.log('[Home] Reloaded matches:', data.length);
      }
    };

    window.addEventListener('bet-placed', handleBetPlaced);
    window.addEventListener('matches-synced', handleMatchesSynced);
    return () => {
      window.removeEventListener('bet-placed', handleBetPlaced);
      window.removeEventListener('matches-synced', handleMatchesSynced);
    };
  }, [activeTab, setHasNewBet]);

  // Mise à jour automatique des statuts toutes les 30 secondes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      console.log('[Home] Auto-updating match statuses...');
      await updateMatchStatuses();

      // Recharger les données de l'onglet actif
      if (activeTab === 'played') {
        const data = await getUserBets('active');
        setActiveBets(data);
      } else if (activeTab === 'upcoming') {
        const data = await fetchAvailableMatches('real');
        setMatches(data);
      }
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [user, activeTab]);

  if (!mounted || authLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="px-4">
          <TabsMatchs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const competitionEmojis: { [key: string]: string } = {
    'Ligue 1': '🇫🇷',
    'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'La Liga': '🇪🇸',
    'Serie A': '🇮🇹',
    'Bundesliga': '🇩🇪',
    'Champions League': '⭐',
    'Europa League': '🏆',
    'Europa Conference League': '🥉',
    'Matchs Internationaux': '🌍',
  };

  const competitionGroups = matches.reduce((acc, match) => {
    const competition = match.competition || match.league || 'Autre';
    const existing = acc.find((group) => group.competition === competition);
    const matchDate = new Date(match.match_date);

    const formattedMatch = {
      id: match.id,
      homeTeam: match.team_a,
      awayTeam: match.team_b,
      league: competition,
      homeOdds: match.odds_a,
      drawOdds: match.odds_draw,
      awayOdds: match.odds_b,
      kickoffTime: matchDate.getTime(),
      datetime: matchDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: match.status || 'upcoming',
      teamABadge: match.team_a_badge,
      teamBBadge: match.team_b_badge,
      teamABanner: match.team_a_banner,
      teamBBanner: match.team_b_banner,
      teamAStadium: match.team_a_stadium,
      teamBStadium: match.team_b_stadium,
    };

    if (existing) {
      existing.matches.push(formattedMatch);
    } else {
      acc.push({
        competition,
        emoji: competitionEmojis[competition] || '⚽',
        matches: [formattedMatch]
      });
    }
    return acc;
  }, [] as { competition: string; emoji: string; matches: any[] }[]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-16 px-4">
          <p className="text-white">Chargement...</p>
        </div>
      );
    }

    if (activeTab === 'upcoming') {
      return (
        <div className="mt-6">
          {competitionGroups.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-[#1A1F27] border border-[#30363D] rounded-2xl p-8 shadow-xl">
                <p className="text-white text-lg font-semibold mb-2">Aucun match à venir</p>
                <p className="text-gray-400 text-sm mb-4">
                  Les prochains matchs apparaîtront ici !
                </p>
                <p className="text-yellow-400 text-xs">
                  Les matchs sont synchronisés automatiquement depuis The Odds API.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Si vous êtes admin, utilisez le bouton "Sync API" dans le panel admin pour forcer une synchronisation.
                </p>
              </div>
            </div>
          ) : (
            <>
              {competitionGroups.map((group, index) => (
                <div key={group.competition}>
                  <div className="mb-6">
                    <div className="px-4 mb-4">
                      <h2 className="text-white text-xl font-bold">
                        {group.emoji} {group.competition}
                      </h2>
                    </div>
                    <LeagueSection leagueGroup={{ league: group.competition, matches: group.matches }} />
                  </div>

                  {/* Insert promo banners between competitions */}
                  {index < competitionGroups.length - 1 && (
                    <div className="px-4">
                      {index % 3 === 0 && <PromoBanner type="token" />}
                      {index % 3 === 1 && <PromoBanner type="friends" />}
                      {index % 3 === 2 && <PromoBanner type="global" />}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      );
    }

    if (activeTab === 'played') {
      if (loading) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <p className="text-white/50">Chargement...</p>
            </div>
          </div>
        );
      }

      if (activeBets.length === 0) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <div className="bg-[#1A1F27] border border-[#30363D] rounded-2xl p-8 shadow-xl">
                <p className="text-white text-lg font-semibold mb-2">Paris en cours</p>
                <p className="text-gray-400 text-sm">
                  Aucun pari en cours. Placez votre premier pari !
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-6 px-4 pb-32">
          <div className="space-y-3">
            {activeBets.map((bet) => (
              bet.is_combo ? (
                <ActiveComboBetCard key={bet.id} bet={bet} />
              ) : (
                <ActiveBetCard key={bet.id} bet={bet} />
              )
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'finished') {
      if (loading) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <p className="text-white/50">Chargement...</p>
            </div>
          </div>
        );
      }

      if (finishedBets.length === 0) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <div className="bg-[#1A1F27] border border-[#30363D] rounded-2xl p-8 shadow-xl">
                <p className="text-white text-lg font-semibold mb-2">Historique</p>
                <p className="text-gray-400 text-sm">
                  L'historique de vos paris apparaîtra ici
                </p>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="mt-6 px-4 pb-32">
          <div className="space-y-3">
            {finishedBets.map((bet) => (
              bet.is_combo ? (
                <FinishedComboBetCard key={bet.id} bet={bet} />
              ) : (
                <FinishedBetCard key={bet.id} bet={bet} />
              )
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <TutorialModal isOpen={showTutorial} onComplete={handleTutorialComplete} />

      <div className="max-w-2xl mx-auto">
        <div className="px-4">
          <TabsMatchs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {renderContent()}

        <BetSlip />
      </div>
    </>
  );
}
