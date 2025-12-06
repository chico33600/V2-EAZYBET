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
          <h1 className="text-2xl font-bold text-white">Airdrop EazyBetCoin</h1>
          <p className="text-sm text-white/50">Préparez-vous pour le lancement</p>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#F5C144]/30 bg-gradient-to-br from-[#F5C144]/10 to-[#C1322B]/10">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-[#F5C144]" />
          <h2 className="text-xl font-bold text-white">Airdrop EazyBetCoin</h2>
        </div>
        <p className="text-white/80 mb-4 leading-relaxed">
          Participez au prochain airdrop <span className="font-bold text-[#F5C144]">$EZBC</span> et recevez vos tokens gratuits!
          Les tokens seront distribués en fonction de votre classement global.
        </p>
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0D1117]/50 border border-[#F5C144]/20">
          <div>
            <p className="text-sm text-white/50 mb-1">Vos diamants</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span className="text-2xl font-bold text-white">{diamonds.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/50 mb-1">Tokens estimés</p>
            <span className="text-2xl font-bold bg-gradient-to-r from-[#F5C144] to-[#C1322B] bg-clip-text text-transparent">
              {diamonds.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#2A84FF]/10 border border-[#2A84FF]/20">
          <p className="text-xs text-white/70 text-center">
            <span className="font-bold text-[#2A84FF]">1 diamant = 1 token estimé</span> (exemple : 50 diamants = 50 tokens)
          </p>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border border-[#30363D]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#F5C144]" />
          Critères d'éligibilité
        </h3>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#C1322B]/10 to-[#8B1F1A]/10 border border-[#C1322B]/30">
            <div className="flex items-start gap-3 mb-2">
              <Trophy className="w-5 h-5 text-[#F5C144] mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">Classement Global</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Le critère principal pour le prochain airdrop. Plus vous êtes haut dans le classement, plus vous recevrez de tokens.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">💎</div>
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">1. Accumulation de diamants</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Il faut avoir le plus de diamants possible. C'est le critère principal pour le classement.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]">
            <div className="flex items-start gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">2. Ratio de réussite</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Un bon ratio de réussite est déterminant pour rester en haut du classement.
                  <span className="block mt-1 text-green-400 font-semibold">Plus vous performez, plus vous êtes éligible.</span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#2A84FF]/10 border border-[#2A84FF]/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#2A84FF] mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">Critères supplémentaires</h4>
                <p className="text-sm text-white/70">
                  D'autres critères d'éligibilité seront bientôt annoncés. Restez connecté!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#C1322B]/20 to-[#F5C144]/20 border border-[#F5C144]/30">
          <p className="text-sm text-white font-semibold text-center">
            Pour l'instant, il faut performer et prendre de l'avance dans les paris!
          </p>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border border-[#30363D]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2A84FF]" />
          Restez informé
        </h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          Suivez les dernières annonces, NFT, récompenses et événements EazyBetCoin en nous suivant sur les réseaux sociaux.
        </p>
        <button
          onClick={() => router.push('/profil')}
          className="w-full flex items-center justify-center gap-2 bg-[#2A84FF]/20 hover:bg-[#2A84FF]/30 border border-[#2A84FF]/40 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
        >
          <ExternalLink size={18} />
          <span>Voir les liens réseaux sociaux</span>
        </button>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#2A84FF]/30 bg-gradient-to-br from-[#2A84FF]/10 to-[#1A5FCC]/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#2A84FF]/20">
            <Wallet className="w-6 h-6 text-[#2A84FF]" />
          </div>
          <h2 className="text-xl font-bold text-white">Wallet EazyBet</h2>
        </div>
        <p className="text-white/80 mb-4 leading-relaxed">
          Le <span className="font-bold text-[#2A84FF]">Wallet EAZYBET</span> arrive bientôt! Vous pourrez profiter de l'univers Web3 et des cryptomonnaies gratuitement.
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="w-4 h-4 text-[#F5C144]" />
            <span>Contenu exclusif</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="w-4 h-4 text-[#F5C144]" />
            <span>Offres spéciales</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="w-4 h-4 text-[#F5C144]" />
            <span>NFT et surprises</span>
          </div>
        </div>
        <button
          onClick={() => setShowWalletModal(true)}
          className="w-full bg-gradient-to-r from-[#2A84FF] to-[#1A5FCC] hover:from-[#3A94FF] hover:to-[#2A6FDC] text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
        >
          Connecter votre Wallet
        </button>
      </div>

      {showWalletModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowWalletModal(false)}>
          <div className="glassmorphism rounded-3xl p-6 max-w-md w-full border-2 border-[#2A84FF]/30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[#2A84FF]/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-[#2A84FF]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Wallet en préparation</h3>
              <p className="text-white/70 mb-6 leading-relaxed">
                Le wallet EazyBet n'est pas encore disponible. Restez connecté pour ne pas manquer son lancement!
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
