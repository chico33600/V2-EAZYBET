import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Match } from './mock-data';
import type { Match as SupabaseMatch } from './supabase-client';

interface UserState {
  coins: number;
  diamonds: number;
  dailyTickets: number;
  addCoins: (amount: number) => void;
  addDiamonds: (amount: number) => void;
  deductCoins: (amount: number) => void;
  deductDiamonds: (amount: number) => void;
  setDailyTickets: (tickets: number) => void;
  decrementTicket: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      coins: 1000.0,
      diamonds: 0,
      dailyTickets: 5,
      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      addDiamonds: (amount) => set((state) => ({ diamonds: state.diamonds + amount })),
      deductCoins: (amount) => set((state) => ({ coins: Math.max(0, state.coins - amount) })),
      deductDiamonds: (amount) => set((state) => ({ diamonds: Math.max(0, state.diamonds - amount) })),
      setDailyTickets: (tickets) => set({ dailyTickets: tickets }),
      decrementTicket: () => set((state) => ({ dailyTickets: Math.max(0, state.dailyTickets - 1) })),
    }),
    {
      name: 'easybet-user-storage',
    }
  )
);

export type BetType = 'home' | 'draw' | 'away';

export interface BetSelection {
  match: Match;
  betType: BetType;
  odds: number;
}

interface BetState {
  selections: BetSelection[];
  addSelection: (selection: BetSelection) => void;
  removeSelection: (matchId: string) => void;
  clearSelections: () => void;
  toggleSelection: (selection: BetSelection) => void;
}

export const useBetStore = create<BetState>((set, get) => ({
  selections: [],

  addSelection: (selection) => set((state) => {
    const existingIndex = state.selections.findIndex(s => s.match.id === selection.match.id);
    if (existingIndex !== -1) {
      const newSelections = [...state.selections];
      newSelections[existingIndex] = selection;
      return { selections: newSelections };
    }
    return { selections: [...state.selections, selection] };
  }),

  removeSelection: (matchId) => set((state) => ({
    selections: state.selections.filter(s => s.match.id !== matchId)
  })),

  clearSelections: () => set({ selections: [] }),

  toggleSelection: (selection) => {
    const state = get();
    const existing = state.selections.find(
      s => s.match.id === selection.match.id && s.betType === selection.betType
    );

    console.log('[BetStore] toggleSelection:', {
      matchId: selection.match.id,
      betType: selection.betType,
      existing: !!existing,
      currentSelections: state.selections.length
    });

    if (existing) {
      console.log('[BetStore] Removing selection (exact match):', selection.match.id);
      state.removeSelection(selection.match.id);
    } else {
      // Vérifier si on a déjà une sélection sur ce match (avec une autre cote)
      const sameMatch = state.selections.find(s => s.match.id === selection.match.id);
      if (sameMatch) {
        console.log('[BetStore] Replacing selection on same match with different bet type');
        state.removeSelection(selection.match.id);
        state.addSelection(selection);
        return;
      }

      // En mode pari simple (1 sélection), remplacer automatiquement la sélection
      if (state.selections.length === 1) {
        console.log('[BetStore] Replacing existing single selection with new one');
        set({ selections: [selection] });
      } else {
        console.log('[BetStore] Adding selection:', selection.match.id);
        state.addSelection(selection);
      }
    }

    const newState = get();
    console.log('[BetStore] After toggle, selections:', newState.selections.length);
  },
}));

export type BetStatus = 'pending' | 'won' | 'lost';

export interface BetSelectionData {
  match: Match;
  betType: BetType;
  odds: number;
}

export interface UserBet {
  id: string;
  type: 'simple' | 'combo';
  selections: BetSelectionData[];
  totalOdds: number;
  amount: number;
  currency: 'coins' | 'diamonds';
  potentialWin: number;
  potentialDiamonds: number;
  status: BetStatus;
  placedAt: number;
}

interface UserBetsState {
  bets: UserBet[];
  addBet: (bet: UserBet) => void;
  updateBetStatus: (betId: string, status: BetStatus) => void;
  getBetsByStatus: (status: BetStatus) => UserBet[];
  getAllBets: () => UserBet[];
  clearAllBets: () => void;
}

export const useUserBetsStore = create<UserBetsState>()(
  persist(
    (set, get) => ({
      bets: [],

      addBet: (bet) => set((state) => ({
        bets: [...state.bets, bet]
      })),

      updateBetStatus: (betId, status) => set((state) => ({
        bets: state.bets.map(bet =>
          bet.id === betId ? { ...bet, status } : bet
        )
      })),

      getBetsByStatus: (status) => {
        const bets = get().bets || [];
        return bets.filter(bet => bet && bet.status === status && bet.selections && Array.isArray(bet.selections));
      },

      getAllBets: () => {
        return get().bets;
      },

      clearAllBets: () => set({ bets: [] }),
    }),
    {
      name: 'easybet-user-bets-storage',
    }
  )
);

interface MatchStatusState {
  matchStatuses: Record<string, Match['status']>;
  setMatchStatus: (matchId: string, status: Match['status']) => void;
  getMatchStatus: (matchId: string) => Match['status'] | undefined;
  clearAllStatuses: () => void;
}

export const useMatchStatusStore = create<MatchStatusState>()(
  persist(
    (set, get) => ({
      matchStatuses: {},

      setMatchStatus: (matchId, status) => set((state) => ({
        matchStatuses: { ...state.matchStatuses, [matchId]: status }
      })),

      getMatchStatus: (matchId) => {
        return get().matchStatuses[matchId];
      },

      clearAllStatuses: () => set({ matchStatuses: {} }),
    }),
    {
      name: 'easybet-match-status-storage',
    }
  )
);

interface BetSlipUIState {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}

export const useBetSlipUIStore = create<BetSlipUIState>((set) => ({
  isExpanded: false,
  setIsExpanded: (isExpanded) => set({ isExpanded }),
}));

type HomeTab = 'upcoming' | 'played' | 'finished';
type SportType = 'soccer' | 'nba' | 'nfl' | 'mma';

interface NavigationState {
  activeHomeTab: HomeTab;
  activeSport: SportType;
  setActiveHomeTab: (tab: HomeTab) => void;
  setActiveSport: (sport: SportType) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      activeHomeTab: 'upcoming',
      activeSport: 'soccer',
      setActiveHomeTab: (tab) => set({ activeHomeTab: tab }),
      setActiveSport: (sport) => set({ activeSport: sport }),
    }),
    {
      name: 'easybet-navigation-storage',
    }
  )
);

interface BadgeState {
  hasNewBet: boolean;
  hasNewResult: boolean;
  setHasNewBet: (value: boolean) => void;
  setHasNewResult: (value: boolean) => void;
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set) => ({
      hasNewBet: false,
      hasNewResult: false,
      setHasNewBet: (value) => set({ hasNewBet: value }),
      setHasNewResult: (value) => set({ hasNewResult: value }),
    }),
    {
      name: 'easybet-badge-storage',
    }
  )
);

interface TutorialState {
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
}

export const useTutorialStore = create<TutorialState>((set) => ({
  showTutorial: false,
  setShowTutorial: (show) => set({ showTutorial: show }),
}));

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheState {
  matchesBySport: Record<string, CacheEntry<SupabaseMatch[]>>;
  activeBets: CacheEntry<any[]> | null;
  historyBets: CacheEntry<any[]> | null;
  profile: CacheEntry<any> | null;
  dailyBetsCount: CacheEntry<number> | null;

  setMatchesCache: (sport: string, data: SupabaseMatch[], ttl?: number) => void;
  getMatchesCache: (sport: string) => SupabaseMatch[] | null;

  setActiveBetsCache: (data: any[], ttl?: number) => void;
  getActiveBetsCache: () => any[] | null;

  setHistoryBetsCache: (data: any[], ttl?: number) => void;
  getHistoryBetsCache: () => any[] | null;

  setProfileCache: (data: any, ttl?: number) => void;
  getProfileCache: () => any | null;

  setDailyBetsCountCache: (count: number, ttl?: number) => void;
  getDailyBetsCountCache: () => number | null;

  clearCache: () => void;
}

const DEFAULT_TTL = {
  matches: 2 * 60 * 1000,
  bets: 1 * 60 * 1000,
  profile: 30 * 1000,
  dailyBets: 1 * 60 * 1000,
};

function isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.ttl;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  matchesBySport: {},
  activeBets: null,
  historyBets: null,
  profile: null,
  dailyBetsCount: null,

  setMatchesCache: (sport, data, ttl = DEFAULT_TTL.matches) => {
    set((state) => ({
      matchesBySport: {
        ...state.matchesBySport,
        [sport]: { data, timestamp: Date.now(), ttl }
      }
    }));
  },

  getMatchesCache: (sport) => {
    const entry = get().matchesBySport[sport];
    return isCacheValid(entry) ? entry.data : null;
  },

  setActiveBetsCache: (data, ttl = DEFAULT_TTL.bets) => {
    set({ activeBets: { data, timestamp: Date.now(), ttl } });
  },

  getActiveBetsCache: () => {
    const entry = get().activeBets;
    return (entry && isCacheValid(entry)) ? entry.data : null;
  },

  setHistoryBetsCache: (data, ttl = DEFAULT_TTL.bets) => {
    set({ historyBets: { data, timestamp: Date.now(), ttl } });
  },

  getHistoryBetsCache: () => {
    const entry = get().historyBets;
    return (entry && isCacheValid(entry)) ? entry.data : null;
  },

  setProfileCache: (data, ttl = DEFAULT_TTL.profile) => {
    set({ profile: { data, timestamp: Date.now(), ttl } });
  },

  getProfileCache: () => {
    const entry = get().profile;
    return (entry && isCacheValid(entry)) ? entry.data : null;
  },

  setDailyBetsCountCache: (count, ttl = DEFAULT_TTL.dailyBets) => {
    set({ dailyBetsCount: { data: count, timestamp: Date.now(), ttl } });
  },

  getDailyBetsCountCache: () => {
    const entry = get().dailyBetsCount;
    return (entry && isCacheValid(entry)) ? entry.data : null;
  },

  clearCache: () => {
    set({
      matchesBySport: {},
      activeBets: null,
      historyBets: null,
      profile: null,
      dailyBetsCount: null,
    });
  },
}));
