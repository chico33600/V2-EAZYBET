'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useUserStore, useCacheStore } from '@/lib/store';
import { Ticket, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTimeUntilMidnightParis } from '@/lib/timezone-utils';

export function HeaderTickets() {
  const { dailyTickets, setDailyTickets, decrementTicket } = useUserStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [showResetTimer, setShowResetTimer] = useState(false);

  const fetchTickets = async (useCache: boolean = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDailyTickets(5);
        return;
      }

      const cachedCount = useCache ? useCacheStore.getState().getDailyBetsCountCache() : null;

      if (cachedCount !== null) {
        console.log('[HeaderTickets] Using cached daily bets count:', cachedCount);
        const DAILY_BET_LIMIT = 5;
        const ticketsRemaining = Math.max(0, DAILY_BET_LIMIT - cachedCount);
        setDailyTickets(ticketsRemaining);
        return;
      }

      console.log('[HeaderTickets] Fetching daily bets count from API');
      const { data: dailyBetsCount, error } = await supabase
        .rpc('get_user_daily_bets_count', {
          p_user_id: user.id,
          p_target_date: null
        });

      if (error) {
        console.error('Error fetching daily bets count:', error);
        setDailyTickets(5);
        return;
      }

      const DAILY_BET_LIMIT = 5;
      const count = (dailyBetsCount as number) || 0;
      const ticketsRemaining = Math.max(0, DAILY_BET_LIMIT - count);

      useCacheStore.getState().setDailyBetsCountCache(count);
      setDailyTickets(ticketsRemaining);
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
      setDailyTickets(5);
    }
  };

  useEffect(() => {
    fetchTickets();

    let isTabActive = true;

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      if (isTabActive) {
        fetchTickets(false);
      }
    }, 60000);

    const timerIntervalId = setInterval(() => {
      const time = getTimeUntilMidnightParis();
      setTimeUntilReset(time);
    }, 1000);

    const handleBetPlaced = () => {
      setIsAnimating(true);
      decrementTicket();
      fetchTickets(false);
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);
    };

    const handleTicketUsed = () => {
      setIsAnimating(true);
      decrementTicket();
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('bet-placed', handleBetPlaced);
      window.addEventListener('ticket-used', handleTicketUsed);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTickets(false);
    });

    return () => {
      clearInterval(intervalId);
      clearInterval(timerIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription?.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('bet-placed', handleBetPlaced);
        window.removeEventListener('ticket-used', handleTicketUsed);
      }
    };
  }, [decrementTicket, setDailyTickets]);

  const ticketColor = dailyTickets === 0
    ? 'from-red-600/20 to-orange-600/20 border-red-500/30'
    : dailyTickets <= 2
    ? 'from-yellow-600/20 to-orange-600/20 border-yellow-500/30'
    : 'from-purple-600/20 to-pink-600/20 border-purple-500/30';

  const iconColor = dailyTickets === 0
    ? 'text-red-300'
    : dailyTickets <= 2
    ? 'text-yellow-300'
    : 'text-purple-300';

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowResetTimer(dailyTickets === 0)}
      onMouseLeave={() => setShowResetTimer(false)}
    >
      <motion.div
        animate={isAnimating ? {
          scale: [1, 1.15, 0.95, 1.05, 1],
          rotate: [0, -5, 5, -3, 0]
        } : {}}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className={`flex items-center gap-1.5 bg-gradient-to-r ${ticketColor} px-3 py-1.5 rounded-full border transition-all duration-300`}
      >
        <motion.div
          animate={isAnimating ? {
            rotate: [0, -15, 15, -10, 0],
            scale: [1, 1.2, 1]
          } : {}}
          transition={{ duration: 0.6 }}
        >
          <Ticket className={`w-4 h-4 ${iconColor}`} />
        </motion.div>
        <motion.span
          key={dailyTickets}
          initial={{ scale: 1 }}
          animate={isAnimating ? {
            scale: [1, 1.3, 1],
            color: ['#ffffff', '#ef4444', '#ffffff']
          } : {}}
          transition={{ duration: 0.4 }}
          className="text-sm font-semibold text-white"
        >
          {dailyTickets}/5
        </motion.span>
      </motion.div>

      {showResetTimer && dailyTickets === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg z-50 border border-gray-700"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>
              Réinitialisation dans: {String(timeUntilReset.hours).padStart(2, '0')}:
              {String(timeUntilReset.minutes).padStart(2, '0')}:
              {String(timeUntilReset.seconds).padStart(2, '0')}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
