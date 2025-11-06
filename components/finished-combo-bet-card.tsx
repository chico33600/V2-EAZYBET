'use client';

import { CheckCircle2, XCircle, Trophy, Layers, Circle } from 'lucide-react';

interface FinishedComboBetCardProps {
  bet: {
    id: string;
    amount: number;
    bet_currency: string;
    total_odds: number;
    is_win: boolean;
    tokens_won: number;
    diamonds_won: number;
    created_at: string;
    combo_bet_selections: Array<{
      choice: string;
      odds: number;
      matches: {
        id: string;
        team_a: string;
        team_b: string;
        competition: string;
        status: string;
        result: string;
      };
    }>;
  };
}

export function FinishedComboBetCard({ bet }: FinishedComboBetCardProps) {
  const getChoiceLabel = (choice: string, teamA: string, teamB: string) => {
    if (choice === 'A') return teamA;
    if (choice === 'B') return teamB;
    return 'Match nul';
  };

  const getResultLabel = (result: string, teamA: string, teamB: string) => {
    if (result === 'A') return teamA;
    if (result === 'B') return teamB;
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

  const currency = bet.bet_currency || 'tokens';
  const currencyLabel = currency === 'tokens' ? 'jetons' : 'diamants';

  return (
    <div className={`border-2 rounded-2xl p-4 shadow-lg transition-all ${
      bet.is_win
        ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30'
        : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${bet.is_win ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <Layers className={`w-4 h-4 ${bet.is_win ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div>
            <p className={`text-xs font-bold ${bet.is_win ? 'text-green-400' : 'text-red-400'}`}>
              PARI COMBINÉ
            </p>
            <p className="text-white/70 text-xs">{bet.combo_bet_selections.length} sélections</p>
          </div>
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

      <div className="space-y-2 mb-3">
        {bet.combo_bet_selections.map((selection, index) => {
          const selectionWon = selection.choice === selection.matches.result;
          return (
            <div key={index} className={`bg-[#0D1117] rounded-xl p-3 border ${
              selectionWon ? 'border-green-500/30' : 'border-red-500/30'
            }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-white/50 text-xs mb-1">{selection.matches.competition}</p>
                  <p className="text-white font-semibold text-sm">
                    {selection.matches.team_a} vs {selection.matches.team_b}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {selectionWon ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div>
                  <p className="text-white/50 text-xs">Pronostic</p>
                  <p className="text-white font-bold text-sm">
                    {getChoiceLabel(selection.choice, selection.matches.team_a, selection.matches.team_b)}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Résultat</p>
                  <p className={`font-bold text-sm ${selectionWon ? 'text-green-400' : 'text-red-400'}`}>
                    {getResultLabel(selection.matches.result, selection.matches.team_a, selection.matches.team_b)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`rounded-xl p-3 mb-3 border ${
        bet.is_win ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${bet.is_win ? 'text-green-300' : 'text-red-300'}`}>
            Cote totale
          </p>
          <p className={`font-bold text-xl ${bet.is_win ? 'text-green-400' : 'text-red-400'}`}>
            ×{bet.total_odds.toFixed(2)}
          </p>
        </div>
      </div>

      {bet.is_win ? (
        <div className="flex gap-2">
          {bet.tokens_won > 0 && (
            <div className="flex-1 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="w-3 h-3 text-green-400" />
                <p className="text-white/50 text-xs">Gain</p>
              </div>
              <p className="text-green-400 font-bold text-lg">+{bet.tokens_won}</p>
              <p className="text-white/40 text-xs">jetons</p>
            </div>
          )}

          {bet.diamonds_won > 0 && (
            <div className="flex-1 bg-gradient-to-br from-[#2A84FF]/20 to-[#2A84FF]/5 border border-[#2A84FF]/20 rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="w-3 h-3 text-[#2A84FF]" />
                <p className="text-white/50 text-xs">{currency === 'tokens' ? 'Bonus' : 'Gain'}</p>
              </div>
              <p className="text-[#2A84FF] font-bold text-lg">+{bet.diamonds_won}</p>
              <p className="text-white/40 text-xs">diamants</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-white/50 text-xs mb-1">Perte</p>
          <p className="text-red-400 font-bold text-lg">-{bet.amount}</p>
          <p className="text-white/40 text-xs">{currencyLabel}</p>
        </div>
      )}

      <p className="text-white/30 text-xs text-center mt-3">{formatDate(bet.created_at)}</p>
    </div>
  );
}
