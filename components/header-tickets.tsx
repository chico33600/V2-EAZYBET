'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useUserStore } from '@/lib/store';
import { Ticket } from 'lucide-react';

export function HeaderTickets() {
  const { dailyTickets, setDailyTickets } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: dailyBetsCount } = await supabase
        .rpc('get_user_daily_bets_count', {
          p_user_id: user.id,
          p_target_date: new Date().toISOString().split('T')[0]
        });

      const DAILY_BET_LIMIT = 5;
      const count = (dailyBetsCount as number) || 0;
      const ticketsRemaining = Math.max(0, DAILY_BET_LIMIT - count);

      setDailyTickets(ticketsRemaining);
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets:', error);
    } finally {
      setIsLoading(false);
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

    if (typeof window !== 'undefined') {
      window.addEventListener('bet-placed', handleBetPlaced);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTickets();
    });

    return () => {
      clearInterval(intervalId);
      subscription?.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('bet-placed', handleBetPlaced);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-3 py-1.5 rounded-full border border-purple-500/30">
        <Ticket className="w-4 h-4 text-purple-300" />
        <span className="text-sm font-semibold text-white">--/5</span>
      </div>
    );
  }

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
    <div className={`flex items-center gap-1.5 bg-gradient-to-r ${ticketColor} px-3 py-1.5 rounded-full border transition-all duration-300`}>
      <Ticket className={`w-4 h-4 ${iconColor}`} />
      <span className="text-sm font-semibold text-white">{dailyTickets}/5</span>
    </div>
  );
}
