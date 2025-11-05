'use client';

import { CheckCircle2, XCircle, Trophy } from 'lucide-react';

interface FinishedBetCardProps {
  bet: {
    id: string;
    amount: number;
    choice: string;
    odds: number;
    is_win: boolean;
    tokens_won: number;
    diamonds_won: number;
    created_at: string;
    matches: {
      team_a: string;
      team_b: string;
      league: string;
      result: string;
    };
  };
}

export function FinishedBetCard({ bet }: FinishedBetCardProps) {
  const getChoiceLabel = () => {
    if (bet.choice === 'A') return bet.matches.team_a;
    if (bet.choice === 'B') return bet.matches.team_b;
    return 'Match nul';
  };

  const getResultLabel = () => {
    if (bet.matches.result === 'A') return bet.matches.team_a;
    if (bet.matches.result === 'B') return bet.matches.team_b;
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

  return (
    <div className={`border rounded-2xl p-4 shadow-lg transition-all ${
      bet.is_win
        ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30'
        : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-white/50 text-xs mb-1">{bet.matches.league}</p>
          <p className="text-white font-bold text-sm">
            {bet.matches.team_a} vs {bet.matches.team_b}
          </p>
          <p className="text-white/40 text-xs mt-1">{formatDate(bet.created_at)}</p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${
          bet.is_win ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {bet.is_win ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <p className="text-green-400 text-xs font-bold">Gagné</p>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 text-red-400" />
              <p className="text-red-400 text-xs font-bold">Perdu</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#0D1117] rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/50 text-xs">Votre pronostic</p>
          <p className="text-white font-bold">{getChoiceLabel()}</p>
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/50 text-xs">Résultat</p>
          <p className={bet.is_win ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
            {getResultLabel()}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-xs">Cote</p>
          <p className="text-[#F5C144] font-bold">{bet.odds.toFixed(2)}</p>
        </div>
      </div>

      {bet.is_win ? (
        <div className="flex gap-2">
          <div className="flex-1 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <Trophy className="w-3 h-3 text-green-400" />
              <p className="text-white/50 text-xs">Gain</p>
            </div>
            <p className="text-green-400 font-bold text-lg">+{bet.tokens_won}</p>
            <p className="text-white/40 text-xs">jetons</p>
          </div>

          <div className="flex-1 bg-gradient-to-br from-[#2A84FF]/20 to-[#2A84FF]/5 border border-[#2A84FF]/20 rounded-xl p-3">
            <div className="flex items-center gap-1 mb-1">
              <Trophy className="w-3 h-3 text-[#2A84FF]" />
              <p className="text-white/50 text-xs">Bonus</p>
            </div>
            <p className="text-[#2A84FF] font-bold text-lg">+{bet.diamonds_won}</p>
            <p className="text-white/40 text-xs">diamants</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-white/50 text-xs mb-1">Perte</p>
          <p className="text-red-400 font-bold text-lg">-{bet.amount}</p>
          <p className="text-white/40 text-xs">jetons</p>
        </div>
      )}
    </div>
  );
}
