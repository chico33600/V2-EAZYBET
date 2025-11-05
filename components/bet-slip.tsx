'use client';

import { useState } from 'react';
import { useBetStore, useBetSlipUIStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { placeBet } from '@/lib/api-client';
import { Coins, X } from 'lucide-react';

export function BetSlip() {
  const { selections, removeSelection, clearSelections } = useBetStore();
  const { profile, refreshProfile } = useAuth();
  const { isExpanded, setIsExpanded } = useBetSlipUIStore();
  const [amount, setAmount] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState('');

  if (selections.length === 0) return null;

  const getBetTypeLabel = (selection: typeof selections[0]) => {
    switch (selection.betType) {
      case 'home':
        return `${selection.match.homeTeam} gagne`;
      case 'draw':
        return 'Match nul';
      case 'away':
        return `${selection.match.awayTeam} gagne`;
    }
  };

  const betAmount = parseFloat(amount) || 0;
  const availableBalance = profile?.tokens || 0;
  const isCombo = selections.length > 1;
  const selection = selections[0];

  const totalWin = Math.round(betAmount * selection.odds);
  const profit = totalWin - betAmount;
  const potentialDiamonds = Math.round(profit * 0.01);

  const handlePlaceBet = async () => {
    if (!betAmount || betAmount <= 0 || betAmount > availableBalance) return;
    if (isCombo) {
      setError('Les paris combinés ne sont pas encore disponibles');
      return;
    }

    setIsPlacing(true);
    setError('');

    try {
      const choice = selection.betType === 'home' ? 'A' : selection.betType === 'draw' ? 'Draw' : 'B';

      await placeBet(selection.match.id, betAmount, choice);
      await refreshProfile();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bet-placed'));
      }

      setIsExpanded(false);
      clearSelections();
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du placement du pari');
    } finally {
      setIsPlacing(false);
    }
  };

  const handleRemoveSelection = (matchId: string) => {
    removeSelection(matchId);
    if (selections.length === 1) {
      setIsExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-fade-in">
        <div
          onClick={() => setIsExpanded(true)}
          className="max-w-2xl mx-auto bg-gradient-to-r from-[#C1322B] to-[#8B1F1A] rounded-2xl p-4 shadow-2xl cursor-pointer hover:shadow-3xl transition-all border border-[#F5C144]/20 active:scale-[0.98]"
        >
          {isCombo ? (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white/70 text-xs">Pari combiné</p>
                <p className="text-white font-bold text-sm">{selections.length} sélections</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Cote totale</p>
                <p className="text-[#F5C144] font-bold text-lg">
                  {selections.reduce((acc, s) => acc * s.odds, 1).toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-white/70 text-xs">Sélection</p>
                <p className="text-white font-bold text-sm">{getBetTypeLabel(selections[0])}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Cote</p>
                <p className="text-[#F5C144] font-bold text-lg">{selections[0].odds.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end">
      <div
        onClick={() => setIsExpanded(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl mx-auto bg-[#1A1F27] rounded-t-3xl shadow-2xl border-t border-x border-[#30363D] animate-slide-up max-h-[75vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-xl">
                {isCombo ? 'Pari combiné' : 'Votre pari'}
              </h2>
              {isCombo && (
                <p className="text-white/50 text-sm">{selections.length} sélections</p>
              )}
            </div>
            <button
              onClick={() => {
                setIsExpanded(false);
                clearSelections();
              }}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {isCombo && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-3 mb-4">
              <p className="text-yellow-400 text-sm">Les paris combinés ne sont pas encore disponibles</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {selections.map((sel, index) => (
              <div
                key={`${sel.match.id}-${sel.betType}`}
                className="bg-[#0D1117] rounded-2xl p-4 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-white/50 text-xs mb-1">{sel.match.league}</p>
                    <p className="text-white font-semibold text-sm">
                      {sel.match.homeTeam} vs {sel.match.awayTeam}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveSelection(sel.match.id)}
                    className="text-white/50 hover:text-[#C1322B] transition-colors ml-2"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[#F5C144] font-medium text-sm">{getBetTypeLabel(sel)}</p>
                  <p className="text-[#F5C144] font-bold text-xl">@{sel.odds.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {!isCombo && (
            <div className="mb-6">
              <label className="text-white/70 text-sm mb-2 block">Montant à miser (jetons)</label>
              <div className="flex items-center gap-2 bg-[#0D1117] rounded-xl p-3 border border-[#30363D] mb-2">
                <Coins size={20} className="text-[#F5C144]" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Entrez votre mise"
                  min="10"
                  className="flex-1 bg-transparent text-white text-lg font-bold focus:outline-none"
                />
              </div>
              <p className="text-white/50 text-xs">
                Solde disponible : {availableBalance.toFixed(0)} jetons (min. 10)
              </p>
            </div>
          )}

          {betAmount > 0 && !isCombo && (
            <>
              <div className="bg-gradient-to-r from-[#F5C144]/20 to-[#F5C144]/10 border border-[#F5C144]/30 rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-sm">Gain total si vous gagnez</p>
                  <p className="text-[#F5C144] font-bold text-2xl">{totalWin}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-white/50 text-xs">Profit</p>
                  <p className="text-green-400 text-sm font-bold">+{profit} jetons</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#2A84FF]/20 to-[#2A84FF]/10 border border-[#2A84FF]/30 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">Bonus diamants (1% du profit)</p>
                    <p className="text-white/50 text-xs">Si vous gagnez</p>
                  </div>
                  <p className="text-[#2A84FF] font-bold text-2xl">{potentialDiamonds}</p>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {!isCombo && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#1A1F27] via-[#1A1F27] to-transparent">
            <button
              onClick={handlePlaceBet}
              disabled={!betAmount || betAmount <= 0 || betAmount > availableBalance || isPlacing}
              className="w-full py-4 bg-gradient-to-r from-[#C1322B] to-[#8B1F1A] text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl active:scale-[0.98]"
            >
              {isPlacing ? 'Placement en cours...' : 'Placer le pari'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
