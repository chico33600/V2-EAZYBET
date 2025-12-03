'use client';

import { Clock, TrendingUp } from 'lucide-react';

interface ActiveBetCardProps {
  bet: {
    id: string;
    amount: number;
    choice: string;
    odds: number;
    potential_win?: number;
    potential_diamonds?: number;
    is_diamond_bet?: boolean;
    tokens_staked?: number;
    diamonds_staked?: number;
    created_at: string;
    matches: {
      team_a: string;
      team_b: string;
      competition: string;
      match_date: string;
      status?: string;
    };
  };
}

export function ActiveBetCard({ bet }: ActiveBetCardProps) {
  const getChoiceLabel = () => {
    if (bet.choice === 'A') return bet.matches.team_a;
    if (bet.choice === 'B') return bet.matches.team_b;
    return 'Match nul';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isDiamondBet = bet.is_diamond_bet || false;
  const stakedAmount = isDiamondBet ? (bet.diamonds_staked || bet.amount) : (bet.tokens_staked || bet.amount);

  const tokensPotential = isDiamondBet ? 0 : Math.floor(stakedAmount * bet.odds);
  const diamondsPotential = isDiamondBet ? Math.floor(stakedAmount * bet.odds) : 0;
  const diamondsBonus = isDiamondBet ? 0 : Math.floor((tokensPotential - stakedAmount) * 0.01);

  const matchStatus = bet.matches?.status || 'upcoming';
  const matchResult = (bet.matches as any)?.result || null;
  const isLive = matchStatus === 'live';
  const isUpcoming = matchStatus === 'upcoming';
  const isFinishedWithoutResult = matchStatus === 'finished' && !matchResult;
  const isAwaitingResult = isFinishedWithoutResult;

  // Debug logs
  console.log('[ActiveBetCard] Match:', bet.matches.team_a, 'vs', bet.matches.team_b);
  console.log('[ActiveBetCard] Match date:', bet.matches.match_date);
  console.log('[ActiveBetCard] Match status:', matchStatus);
  console.log('[ActiveBetCard] Match result:', matchResult);
  console.log('[ActiveBetCard] Current time:', new Date().toISOString());
  console.log('[ActiveBetCard] Is live?', isLive);
  console.log('[ActiveBetCard] Is awaiting result?', isAwaitingResult);

  return (
    <div className="bg-[#1C2128] border border-[#30363D] rounded-2xl p-4 shadow-lg hover:border-[#F5C144]/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-white/50 text-xs mb-1">{bet.matches.competition}</p>
          <p className="text-white font-bold text-sm">
            {bet.matches.team_a} vs {bet.matches.team_b}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-3 h-3 text-white/40" />
            <p className="text-white/40 text-xs">{formatDate(bet.matches.match_date)}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-lg ${
          isAwaitingResult ? 'bg-orange-500/10' : isLive ? 'bg-blue-500/10' : 'bg-[#F5C144]/10'
        }`}>
          <p className={`text-xs font-bold ${
            isAwaitingResult ? 'text-orange-400' : isLive ? 'text-blue-400' : 'text-[#F5C144]'
          }`}>
            {isAwaitingResult ? 'En attente du résultat 🔍' : isLive ? 'En cours ⏳' : 'En attente'}
          </p>
        </div>
      </div>

      <div className="bg-[#0D1117] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/50 text-xs">Votre pronostic</p>
          <p className="text-white font-bold">{getChoiceLabel()}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-xs">Cote</p>
          <p className="text-[#F5C144] font-bold">{bet.odds.toFixed(2)}</p>
        </div>
      </div>

      {isDiamondBet ? (
        <div className="flex gap-2">
          <div className="flex-1 bg-gradient-to-br from-[#2A84FF]/20 to-[#2A84FF]/5 border border-[#2A84FF]/20 rounded-xl p-3">
            <p className="text-white/50 text-xs mb-1">Misé</p>
            <p className="text-white font-bold text-lg">{stakedAmount} 💎</p>
            <p className="text-white/40 text-xs">diamants</p>
          </div>

          <div className="flex-1 bg-gradient-to-br from-[#2A84FF]/20 to-[#2A84FF]/5 border border-[#2A84FF]/30 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-[#2A84FF]" />
              <p className="text-white/50 text-xs">Gain potentiel</p>
            </div>
            <p className="text-[#2A84FF] font-bold text-lg">{diamondsPotential} 💎</p>
            <p className="text-white/40 text-xs">diamants</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 bg-gradient-to-br from-[#F5C144]/20 to-[#F5C144]/5 border border-[#F5C144]/20 rounded-xl p-3">
            <p className="text-white/50 text-xs mb-1">Misé</p>
            <p className="text-white font-bold text-lg">{stakedAmount}</p>
            <p className="text-white/40 text-xs">jetons</p>
          </div>

          <div className="flex-1 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <p className="text-white/50 text-xs">Gain potentiel</p>
            </div>
            <p className="text-green-400 font-bold text-lg">{tokensPotential}</p>
            <p className="text-[#2A84FF] text-xs font-bold">+ {diamondsBonus} 💎</p>
          </div>
        </div>
      )}
    </div>
  );
}
