'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TabsMatchs } from '@/components/tabs-matchs';
import { LeagueSection } from '@/components/league-section';
import { BetSlip } from '@/components/bet-slip';
import { useAuth } from '@/lib/auth-context';
import { fetchMatches, fetchAvailableMatches, getUserBets } from '@/lib/api-client';
import type { Match } from '@/lib/supabase-client';
import { useNavigationStore, useBadgeStore, useTutorialStore, useLanguageStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { ActiveBetCard } from '@/components/active-bet-card';
import { FinishedBetCard } from '@/components/finished-bet-card';
import { ActiveComboBetCard } from '@/components/active-combo-bet-card';
import { FinishedComboBetCard } from '@/components/finished-combo-bet-card';
import { TutorialModal } from '@/components/tutorial-modal';
import { supabase } from '@/lib/supabase-client';

export default function Home() {
  const { activeHomeTab: activeTab, setActiveHomeTab: setActiveTab } = useNavigationStore();
  const { hasNewBet, setHasNewBet } = useBadgeStore();
  const { showTutorial, setShowTutorial } = useTutorialStore();
  const { language } = useLanguageStore();
  const t = translations[language];
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


  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      const data = await fetchAvailableMatches('real');
      setMatches(data);
      setLoading(false);
    }

    async function loadActiveBets() {
      setLoading(true);
      const data = await getUserBets('active');
      setActiveBets(data);
      setLoading(false);
    }

    async function loadFinishedBets() {
      setLoading(true);
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
        const data = await fetchAvailableMatches('real');
        setMatches(data);
      } else if (activeTab === 'played') {
        const data = await getUserBets('active');
        setActiveBets(data);
      }
    };

    const handleMatchesSynced = async () => {
      console.log('[Home] Matches synced event received!');
      if (activeTab === 'upcoming') {
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
          <p className="text-white">{t.common.loading}</p>
        </div>
      );
    }

    if (activeTab === 'upcoming') {
      return (
        <div className="mt-6">
          {competitionGroups.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="bg-[#1A1F27] border border-[#30363D] rounded-2xl p-8 shadow-xl">
                <p className="text-white text-lg font-semibold mb-2">{t.home.noMatches}</p>
                <p className="text-gray-400 text-sm mb-4">
                  {t.home.noMatchesDesc}
                </p>
                <p className="text-yellow-400 text-xs">
                  {t.home.syncNote}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {t.home.adminNote}
                </p>
              </div>
            </div>
          ) : (
            competitionGroups.map((group) => (
              <div key={group.competition} className="mb-6">
                <div className="px-4 mb-4">
                  <h2 className="text-white text-xl font-bold">
                    {group.emoji} {group.competition}
                  </h2>
                </div>
                <LeagueSection leagueGroup={{ league: group.competition, matches: group.matches }} />
              </div>
            ))
          )}
        </div>
      );
    }

    if (activeTab === 'played') {
      if (loading) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <p className="text-white/50">{t.common.loading}</p>
            </div>
          </div>
        );
      }

      if (activeBets.length === 0) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <div className="bg-[#1A1F27] border border-[#30363D] rounded-2xl p-8 shadow-xl">
                <p className="text-white text-lg font-semibold mb-2">{t.home.tabs.played}</p>
                <p className="text-gray-400 text-sm">
                  {t.home.noBets}. {t.home.noBetsDesc}
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
              <p className="text-white/50">{t.common.loading}</p>
            </div>
          </div>
        );
      }

      if (finishedBets.length === 0) {
        return (
          <div className="mt-6 px-4">
            <div className="text-center py-16">
              <div className="bg-[#1A1F27] border border-[#30363D] rounded-2xl p-8 shadow-xl">
                <p className="text-white text-lg font-semibold mb-2">{t.home.noHistory}</p>
                <p className="text-gray-400 text-sm">
                  {t.home.noHistoryDesc}
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
