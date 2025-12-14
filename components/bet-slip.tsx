'use client';

import { useState, useEffect, useRef } from 'react';
import { useBetStore, useBetSlipUIStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { placeBet, placeCombobet } from '@/lib/api-client';
import { Coins, X, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BetSlip() {
  const { selections, removeSelection, clearSelections } = useBetStore();
  const { profile, refreshProfile } = useAuth();
  const { isExpanded, setIsExpanded } = useBetSlipUIStore();
  const [amount, setAmount] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'tokens' | 'diamonds'>('tokens');
  const previousSelectionsLength = useRef(selections.length);

  const resetBetSlip = () => {
    setAmount('');
    setError('');
    setCurrency('tokens');
    setIsPlacing(false);
    setIsExpanded(false);
  };

  useEffect(() => {
    if (selections.length === 0 && previousSelectionsLength.current > 0) {
      resetBetSlip();
    }
    previousSelectionsLength.current = selections.length;
  }, [selections.length]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 100);
      return () => clearTimeout(timer);
    }
  }, [selections, amount, currency]);

  if (selections.length === 0) {
    if (isExpanded) setIsExpanded(false);
    return null;
  }

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
  const availableTokens = profile?.tokens || 0;
  const availableDiamonds = profile?.diamonds || 0;
  const availableBalance = currency === 'tokens' ? availableTokens : availableDiamonds;
  const isCombo = selections.length > 1;
  const selection = selections[0];

  const comboTotalOdds = isCombo ? selections.reduce((acc, s) => acc * s.odds, 1) : 0;
  const singleOdds = isCombo ? 0 : selection.odds;
  const effectiveOdds = isCombo ? comboTotalOdds : singleOdds;

  const totalWin = Math.floor(betAmount * effectiveOdds);
  const profit = totalWin - betAmount;
  const diamondsBonus = currency === 'tokens' ? Math.floor(profit * 0.01) : 0;

  const handlePlaceBet = async () => {
    if (!betAmount || betAmount <= 0 || betAmount > availableBalance || isPlacing) {
      console.log('[BetSlip] Cannot place bet:', { betAmount, availableBalance, isPlacing });
      return;
    }

    console.log('[BetSlip] Starting bet placement...', { selections, betAmount, currency });
    setIsPlacing(true);
    setError('');

    try {
      if (isCombo) {
        const comboSelections = selections.map(sel => ({
          matchId: sel.match.id,
          choice: (sel.betType === 'home' ? 'A' : sel.betType === 'draw' ? 'Draw' : 'B') as 'A' | 'Draw' | 'B',
          odds: sel.odds
        }));

        console.log('[BetSlip] Placing combo bet...', comboSelections);
        await placeCombobet(comboSelections, betAmount, currency);
      } else {
        const choice = selection.betType === 'home' ? 'A' : selection.betType === 'draw' ? 'Draw' : 'B';
        console.log('[BetSlip] Placing single bet...', { matchId: selection.match.id, amount: betAmount, choice, currency });
        await placeBet(selection.match.id, betAmount, choice, currency);
      }

      console.log('[BetSlip] Bet placed successfully!');
      await refreshProfile();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bet-placed'));
      }

      console.log('[BetSlip] Clearing selections and resetting...');
      clearSelections();
      resetBetSlip();
      console.log('[BetSlip] Reset complete!');
    } catch (err: any) {
      console.error('[BetSlip] Bet placement error:', err);
      setError(err.message || 'Erreur lors du placement du pari');
      setIsPlacing(false);
    }
  };

  const handleRemoveSelection = (matchId: string) => {
    removeSelection(matchId);
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-24 left-0 right-0 z-50 px-4 animate-fade-in">
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-[#C1322B] to-[#8B1F1A] rounded-2xl p-4 shadow-2xl transition-all border border-[#F5C144]/20">
          <div className="flex items-center gap-3">
            <div
              onClick={() => setIsExpanded(true)}
              className="flex-1 cursor-pointer"
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('[BetSlip] User clicked X on minimized betslip');
                clearSelections();
                resetBetSlip();
              }}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
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
                clearSelections();
                resetBetSlip();
              }}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {isCombo && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-green-400 text-sm font-medium">Pari combiné activé</p>
                <p className="text-green-400 text-xl font-bold">×{comboTotalOdds.toFixed(2)}</p>
              </div>
              <p className="text-green-300/70 text-xs mt-1">Toutes les sélections doivent être gagnantes</p>
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

          <div className="mb-6">
              <label className="text-white/70 text-sm mb-2 block">Choisir la monnaie</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setCurrency('tokens')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    currency === 'tokens'
                      ? 'bg-[#F5C144]/20 border-[#F5C144] shadow-lg'
                      : 'bg-[#0D1117] border-[#30363D] hover:border-[#F5C144]/50'
                  }`}
                >
                  <Coins size={24} className={`mx-auto mb-2 ${currency === 'tokens' ? 'text-[#F5C144]' : 'text-white/50'}`} />
                  <p className={`text-sm font-bold ${currency === 'tokens' ? 'text-white' : 'text-white/70'}`}>
                    Jetons
                  </p>
                  <p className={`text-xs ${currency === 'tokens' ? 'text-white/70' : 'text-white/50'}`}>
                    {availableTokens.toFixed(0)}
                  </p>
                </button>
                <button
                  onClick={() => setCurrency('diamonds')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    currency === 'diamonds'
                      ? 'bg-[#2A84FF]/20 border-[#2A84FF] shadow-lg'
                      : 'bg-[#0D1117] border-[#30363D] hover:border-[#2A84FF]/50'
                  }`}
                >
                  <Gem size={24} className={`mx-auto mb-2 ${currency === 'diamonds' ? 'text-[#2A84FF]' : 'text-white/50'}`} />
                  <p className={`text-sm font-bold ${currency === 'diamonds' ? 'text-white' : 'text-white/70'}`}>
                    Diamants
                  </p>
                  <p className={`text-xs ${currency === 'diamonds' ? 'text-white/70' : 'text-white/50'}`}>
                    {availableDiamonds.toFixed(0)}
                  </p>
                </button>
              </div>

              <label className="text-white/70 text-sm mb-2 block">
                Montant à miser ({currency === 'tokens' ? 'jetons' : 'diamants'})
              </label>
              <div className={`flex items-center gap-2 bg-[#0D1117] rounded-xl p-3 border-2 mb-2 ${
                currency === 'tokens' ? 'border-[#F5C144]/30' : 'border-[#2A84FF]/30'
              }`}>
                {currency === 'tokens' ? (
                  <Coins size={20} className="text-[#F5C144]" />
                ) : (
                  <Gem size={20} className="text-[#2A84FF]" />
                )}
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
                Solde disponible : {availableBalance.toFixed(0)} {currency === 'tokens' ? 'jetons' : 'diamants'}
              </p>
            </div>

          {betAmount > 0 && (
            <>
              {currency === 'tokens' ? (
                <>
                  <div className="bg-gradient-to-r from-[#F5C144]/20 to-[#F5C144]/10 border border-[#F5C144]/30 rounded-2xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/70 text-sm">Gain total si vous gagnez</p>
                      <p className="text-[#F5C144] font-bold text-2xl">{totalWin} 💰</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-white/50 text-xs">Profit en jetons</p>
                      <p className="text-green-400 text-sm font-bold">+{profit} jetons</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#2A84FF]/20 to-[#2A84FF]/10 border border-[#2A84FF]/30 rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm">Bonus diamants (1% du profit)</p>
                        <p className="text-white/50 text-xs">Si vous gagnez</p>
                      </div>
                      <p className="text-[#2A84FF] font-bold text-2xl">{diamondsBonus} 💎</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-r from-[#2A84FF]/20 to-[#2A84FF]/10 border border-[#2A84FF]/30 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/70 text-sm">Gain total si vous gagnez</p>
                    <p className="text-[#2A84FF] font-bold text-2xl">{totalWin} 💎</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-white/50 text-xs">Profit en diamants</p>
                    <p className="text-[#2A84FF] text-sm font-bold">+{profit} diamants</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#2A84FF]/20">
                    <p className="text-white/60 text-xs">Pari en diamants = gains en diamants uniquement</p>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button
                onClick={() => {
                  console.log('[BetSlip] User clicked cancel after error');
                  clearSelections();
                  resetBetSlip();
                }}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-colors text-sm font-medium"
              >
                Annuler et choisir un autre match
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-[#1A1F27] via-[#1A1F27] to-transparent">
          <Button
            onClick={handlePlaceBet}
            disabled={!betAmount || betAmount <= 0 || betAmount > availableBalance || isPlacing}
            variant="eazy"
            className="w-full py-4 text-lg rounded-2xl active:scale-[0.98]"
          >
            {isPlacing ? 'Placement en cours...' : isCombo ? 'Placer le pari combiné' : 'Placer le pari'}
          </Button>
        </div>
      </div>
    </div>
  );
}
