'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useUserStore } from '@/lib/store';
import { Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeaderTickets() {
  const { dailyTickets, setDailyTickets } = useUserStore();
  const [isAnimating, setIsAnimating] = useState(false);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDailyTickets(5);
        return;
      }

      const { data: dailyBetsCount, error } = await supabase
        .rpc('get_user_daily_bets_count', {
          p_user_id: user.id,
          p_target_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error fetching daily bets count:', error);
        setDailyTickets(5);
        return;
      }

      const DAILY_BET_LIMIT = 5;
      const count = (dailyBetsCount as number) || 0;
      const ticketsRemaining = Math.max(0, DAILY_BET_LIMIT - count);

      setDailyTickets(ticketsRemaining);
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
      setDailyTickets(5);
    }
  };

  useEffect(() => {
    fetchTickets();

    const intervalId = setInterval(() => {
      fetchTickets();
    }, 30000);

    const handleBetPlaced = () => {
      fetchTickets();
    };

    const handleTicketUsed = () => {
      setIsAnimating(true);
      if (dailyTickets > 0) {
        setDailyTickets(dailyTickets - 1);
      }
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('bet-placed', handleBetPlaced);
      window.addEventListener('ticket-used', handleTicketUsed);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTickets();
    });

    return () => {
      clearInterval(intervalId);
      subscription?.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('bet-placed', handleBetPlaced);
        window.removeEventListener('ticket-used', handleTicketUsed);
      }
    };
  }, [dailyTickets]);

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
  );
}
