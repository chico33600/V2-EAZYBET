'use client';

import { useState, useEffect } from 'react';
import { Gift, Trophy, TrendingUp, Sparkles, Users, Wallet, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function AirdropPage() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const diamonds = profile?.diamonds || 0;

  useEffect(() => {
    const handleBetPlaced = () => {
      refreshProfile();
    };

    const handleProfileUpdated = () => {
      refreshProfile();
    };

    window.addEventListener('bet-placed', handleBetPlaced);
    window.addEventListener('profile-updated', handleProfileUpdated);

    return () => {
      window.removeEventListener('bet-placed', handleBetPlaced);
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [refreshProfile]);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-[#C1322B]/20 to-[#2A84FF]/20">
          <Gift className="w-8 h-8 text-[#F5C144]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Airdrop EazyBet</h1>
          <p className="text-sm text-white/50">Préparez-vous pour la distribution des récompenses crypto</p>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#F5C144]/20 overflow-hidden">
        <img
          src="/pixgenie_1765159614709.png"
          alt="Cryptomonnaies"
          className="w-full h-auto object-cover rounded-2xl"
        />
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#F5C144]/30 bg-gradient-to-br from-[#F5C144]/10 to-[#C1322B]/10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-3">
            <span className="bg-gradient-to-r from-[#F5C144] to-[#C1322B] bg-clip-text text-transparent">
              Bitcoin, cryptos réelles
            </span>
          </h2>
          <p className="text-white/90 text-lg font-semibold">
            Zéro achat. Zéro risque. Que du gain.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D1117]/50 border-2 border-[#F5C144]/30 mb-4">
          <div className="text-center mb-3">
            <p className="text-sm text-white/50 mb-2">Vos diamants</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl">💎</span>
              <span className="text-3xl font-bold text-white">{diamonds.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-center pt-3 border-t border-white/10">
            <p className="text-xs text-white/60">
              Seuls les <span className="font-bold text-[#F5C144]">meilleurs joueurs</span> accèdent aux distributions
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#C1322B]/10 border border-[#C1322B]/30">
          <p className="text-xs text-white/70 text-center">
            ⚠️ Les diamants mesurent votre éligibilité mais ne sont pas convertibles directement
          </p>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#C1322B]/30 bg-gradient-to-br from-[#C1322B]/10 to-[#8B1F1A]/10">
        <div className="text-center mb-4">
          <Trophy className="w-12 h-12 text-[#F5C144] mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Comment être éligible ?</h3>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#F5C144]/20 text-center">
            <div className="text-2xl mb-2">🏆</div>
            <p className="text-white font-bold mb-1">Montez dans le classement</p>
            <p className="text-sm text-white/70">Plus vous êtes haut, plus vous gagnez</p>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-green-400/20 text-center">
            <div className="text-2xl mb-2">📈</div>
            <p className="text-white font-bold mb-1">Performez régulièrement</p>
            <p className="text-sm text-white/70">Taux de réussite = éligibilité</p>
          </div>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#2A84FF]/30 bg-gradient-to-br from-[#2A84FF]/10 to-[#1A5FCC]/10">
        <div className="text-center mb-4">
          <Wallet className="w-12 h-12 text-[#2A84FF] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Distribution prochaine</h2>
          <p className="text-white/80">
            Connectez votre wallet pour recevoir vos cryptos
          </p>
        </div>

        <button
          onClick={() => setShowWalletModal(true)}
          className="w-full bg-gradient-to-r from-[#2A84FF] to-[#1A5FCC] hover:from-[#3A94FF] hover:to-[#2A6FDC] text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-95 shadow-lg text-lg"
        >
          Préparer mon wallet
        </button>

        <button
          onClick={() => router.push('/profil')}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
        >
          <Users size={18} />
          <span>Suivre les annonces</span>
        </button>
      </div>

      {showWalletModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowWalletModal(false)}>
          <div className="glassmorphism rounded-3xl p-6 max-w-md w-full border-2 border-[#2A84FF]/30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[#2A84FF]/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-[#2A84FF]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Wallets partenaires en préparation</h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                Les intégrations avec les wallets partenaires Web3 arrivent bientôt. Restez connecté pour ne pas manquer les annonces!
              </p>
              <button
                onClick={() => setShowWalletModal(false)}
                className="w-full bg-[#2A84FF] hover:bg-[#3A94FF] text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
