'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TabsMatchs } from '@/components/tabs-matchs';
import { LeagueSection } from '@/components/league-section';
import { BetSlip } from '@/components/bet-slip';
import { useAuth } from '@/lib/auth-context';
import { fetchMatches, fetchAvailableMatches, getUserBets, invalidateBetsCache, invalidateMatchesCache } from '@/lib/api-client';
import type { Match } from '@/lib/supabase-client';
import { useNavigationStore, useBadgeStore, useTutorialStore } from '@/lib/store';
import { ActiveBetCard } from '@/components/active-bet-card';
import { FinishedBetCard } from '@/components/finished-bet-card';
import { ActiveComboBetCard } from '@/components/active-combo-bet-card';
import { FinishedComboBetCard } from '@/components/finished-combo-bet-card';
import { TutorialModal } from '@/components/tutorial-modal';
import { PromoBanner } from '@/components/promo-banner';
import { SplashScreen } from '@/components/splash-screen';
import { OtherSportsButton } from '@/components/other-sports-button';
import { WinNotificationModal } from '@/components/win-notification-modal';
import { supabase } from '@/lib/supabase-client';

export default function Home() {
  const { activeHomeTab: activeTab, setActiveHomeTab: setActiveTab, activeSport, setActiveSport } = useNavigationStore();
  const { hasNewBet, setHasNewBet } = useBadgeStore();
  const { showTutorial, setShowTutorial } = useTutorialStore();
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeBets, setActiveBets] = useState<any[]>([]);
  const [finishedBets, setFinishedBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWinNotification, setShowWinNotification] = useState(false);
  const [winDetails, setWinDetails] = useState({ tokens: 0, diamonds: 0 });
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;

    const SESSION_KEY = 'eazybet_session_active';
    const LAST_ACTIVITY_KEY = 'eazybet_last_activity';
    const INACTIVITY_THRESHOLD = 30 * 60 * 1000;

    const isSessionActive = sessionStorage.getItem(SESSION_KEY);
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    const now = Date.now();

    let shouldShowSplash = false;

    if (!isSessionActive) {
      shouldShowSplash = true;
      sessionStorage.setItem(SESSION_KEY, 'true');
    } else if (lastActivity) {
      const timeSinceLastActivity = now - parseInt(lastActivity, 10);
      if (timeSinceLastActivity > INACTIVITY_THRESHOLD) {
        shouldShowSplash = true;
      }
    }

    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

    if (shouldShowSplash) {
      setShowSplash(true);
    }

    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, [user, authLoading]);

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
      console.log('[Home] Loading matches for sport:', activeSport);
      setLoading(true);
      const data = await fetchAvailableMatches('real', activeSport);
      console.log('[Home] Loaded matches count:', data.length);
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
      console.log('[Home] Effect triggered - loading matches');
      loadMatches();
    } else if (user && activeTab === 'played') {
      loadActiveBets();
    } else if (user && activeTab === 'finished') {
      loadFinishedBets();
    } else if (user) {
      setMatches([]);
      setLoading(false);
    }
  }, [activeTab, user, activeSport]);

  useEffect(() => {
    const handleBetPlaced = () => {
      setHasNewBet(true);
      invalidateBetsCache();
      invalidateMatchesCache();
    };

    const handleMatchesSynced = () => {
      console.log('[Home] Matches synced event received!');
      invalidateMatchesCache();
    };

    window.addEventListener('bet-placed', handleBetPlaced);
    window.addEventListener('matches-synced', handleMatchesSynced);
    return () => {
      window.removeEventListener('bet-placed', handleBetPlaced);
      window.removeEventListener('matches-synced', handleMatchesSynced);
    };
  }, [setHasNewBet]);

  useEffect(() => {
    if (!user) return;

    let isTabActive = true;

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
      console.log('[Home] Tab visibility changed:', isTabActive ? 'active' : 'inactive');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (!isTabActive) {
        console.log('[Home] Skipping polling - tab is inactive');
        return;
      }

      console.log('[Home] Invalidating cache for auto-refresh...');
      invalidateBetsCache();
      invalidateMatchesCache();
    }, 120000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const LAST_WIN_CHECK_KEY = 'eazybet_last_win_check';
    const WIN_NOTIFICATION_KEY = 'eazybet_shown_wins';

    const checkForNewWins = async () => {
      try {
        const [simpleBetsResult, comboBetsResult] = await Promise.all([
          supabase
            .from('bets')
            .select('id, tokens_won, diamonds_won, created_at, updated_at')
            .eq('user_id', user.id)
            .eq('is_win', true)
            .gt('tokens_staked', 0)
            .order('updated_at', { ascending: false })
            .limit(3),
          supabase
            .from('combo_bets')
            .select('id, tokens_won, diamonds_won, created_at, updated_at')
            .eq('user_id', user.id)
            .eq('is_win', true)
            .gt('tokens_staked', 0)
            .order('updated_at', { ascending: false })
            .limit(3)
        ]);

        const allWins = [
          ...(simpleBetsResult.data || []),
          ...(comboBetsResult.data || [])
        ].sort((a, b) => {
          const timeA = new Date(a.updated_at || a.created_at).getTime();
          const timeB = new Date(b.updated_at || b.created_at).getTime();
          return timeB - timeA;
        });

        if (allWins.length === 0) return;

        const shownWins = JSON.parse(localStorage.getItem(WIN_NOTIFICATION_KEY) || '[]');
        const newWins = allWins.filter(win => !shownWins.includes(win.id));

        if (newWins.length > 0) {
          const latestWin = newWins[0];
          const lastCheck = localStorage.getItem(LAST_WIN_CHECK_KEY);
          const winTime = new Date(latestWin.updated_at || latestWin.created_at).getTime();
          const lastCheckTime = lastCheck ? parseInt(lastCheck) : 0;

          if (winTime > lastCheckTime) {
            setWinDetails({
              tokens: latestWin.tokens_won || 0,
              diamonds: latestWin.diamonds_won || 0
            });
            setShowWinNotification(true);

            shownWins.push(latestWin.id);
            localStorage.setItem(WIN_NOTIFICATION_KEY, JSON.stringify(shownWins.slice(-20)));
            localStorage.setItem(LAST_WIN_CHECK_KEY, Date.now().toString());
          }
        }
      } catch (error) {
        console.error('[Home] Error checking for wins:', error);
      }
    };

    checkForNewWins();

    const interval = setInterval(checkForNewWins, 30000);

    return () => clearInterval(interval);
  }, [user]);

  if (showSplash || !mounted || authLoading) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
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
        <div className="mt-4">
          {competitionGroups.length === 0 ? (
            <>
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
            </>
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
      <WinNotificationModal
        isOpen={showWinNotification}
        onClose={() => setShowWinNotification(false)}
        tokensWon={winDetails.tokens}
        diamondsWon={winDetails.diamonds}
      />

      <div className="max-w-2xl mx-auto">
        <div className="px-4">
          <TabsMatchs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {activeTab === 'upcoming' && (
          <OtherSportsButton
            currentSport={activeSport}
            onSportSelect={(sport) => setActiveSport(sport as any)}
          />
        )}

        {renderContent()}

        <BetSlip />
      </div>
    </>
  );
}
