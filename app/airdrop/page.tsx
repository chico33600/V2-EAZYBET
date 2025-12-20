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
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-[#F5C144]" />
          <h2 className="text-xl font-bold text-white">Airdrop EazyBet</h2>
        </div>
        <p className="text-white/80 mb-4 leading-relaxed">
          Participez aux prochaines campagnes de récompenses EazyBet et recevez des <span className="font-bold text-[#F5C144]">récompenses en cryptomonnaies réelles</span> (Bitcoin et autres cryptos partenaires).
        </p>
        <p className="text-white/80 mb-4 leading-relaxed">
          Les récompenses sont attribuées aux <span className="font-bold">meilleurs joueurs</span>, en fonction de leurs <span className="font-bold">performances globales</span>, de leur <span className="font-bold">régularité</span> et de leur <span className="font-bold">classement</span> dans le jeu.
        </p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>💡</span>
            <span>Aucun achat.</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>💡</span>
            <span>Aucun dépôt.</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <span>💡</span>
            <span>Zéro risque financier.</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0D1117]/50 border border-[#F5C144]/20">
          <div>
            <p className="text-sm text-white/50 mb-1">Vos diamants</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span className="text-2xl font-bold text-white">{diamonds.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/50 mb-1">Récompenses estimées</p>
            <span className="text-lg font-bold bg-gradient-to-r from-[#F5C144] to-[#C1322B] bg-clip-text text-transparent">
              🎁 Calculées lors de la distribution officielle
            </span>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#2A84FF]/10 border border-[#2A84FF]/20">
          <p className="text-xs text-white/70 leading-relaxed">
            Les diamants sont un <span className="font-bold text-white">indicateur de performance</span>.
            Ils servent à mesurer votre niveau et votre éligibilité aux récompenses.
          </p>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-[#C1322B]/10 border border-[#C1322B]/20">
          <p className="text-xs text-white/70 text-center">
            ⚠️ Les diamants <span className="font-bold text-white">ne sont pas convertibles directement</span> en cryptomonnaie.
          </p>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border border-[#30363D]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#2A84FF]" />
          Bloc Explication
        </h3>
        <p className="text-white/80 mb-4 leading-relaxed font-semibold">
          Les diamants n'ont <span className="text-[#C1322B]">aucune valeur monétaire directe</span>.
        </p>
        <p className="text-white/80 mb-3 leading-relaxed">
          Ils permettent de :
        </p>
        <div className="space-y-2 mb-4 ml-4">
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Vous positionner dans le <span className="font-bold">classement global</span></span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Évaluer votre <span className="font-bold">niveau de jeu</span></span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Déterminer votre <span className="font-bold">éligibilité</span> et votre <span className="font-bold">part potentielle</span> lors des campagnes de récompenses crypto.</span>
          </div>
        </div>
        <p className="text-white/80 leading-relaxed">
          Seuls les joueurs les plus performants accèdent aux distributions.
        </p>
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
                <h4 className="font-bold text-white mb-1">🏆 Classement global</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Critère principal pour les campagnes de récompenses.
                </p>
                <p className="text-sm text-white/70 leading-relaxed mt-1">
                  Plus vous êtes haut dans le classement, plus vous augmentez vos chances d'être récompensé.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">💎</div>
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">💎 1. Accumulation de diamants</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Accumulez un maximum de diamants grâce à vos performances et votre régularité.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1117]/50 border border-[#30363D]">
            <div className="flex items-start gap-3 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">📈 2. Ratio de réussite</h4>
                <p className="text-sm text-white/70 leading-relaxed">
                  Un bon taux de réussite améliore fortement votre position.
                </p>
                <p className="text-sm text-green-400 font-semibold mt-1">
                  Plus vous performez, plus vous êtes éligible.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#2A84FF]/10 border border-[#2A84FF]/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#2A84FF] mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-white/70">
                  ℹ️ Les critères précis peuvent évoluer selon les campagnes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border border-[#30363D]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2A84FF]" />
          Restez informé
        </h3>
        <p className="text-white/80 mb-4 leading-relaxed">
          Suivez les annonces officielles pour ne rien manquer :
        </p>
        <div className="space-y-2 mb-4 ml-4">
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Nouvelles campagnes de récompenses</span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Cryptomonnaies distribuées</span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Partenariats Web3</span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>NFTs et power-ups à venir</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/profil')}
          className="w-full flex items-center justify-center gap-2 bg-[#2A84FF]/20 hover:bg-[#2A84FF]/30 border border-[#2A84FF]/40 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-95"
        >
          <ExternalLink size={18} />
          <span>👉 Voir les liens des réseaux sociaux</span>
        </button>
      </div>

      <div className="glassmorphism rounded-3xl p-6 mb-6 border-2 border-[#2A84FF]/30 bg-gradient-to-br from-[#2A84FF]/10 to-[#1A5FCC]/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-[#2A84FF]/20">
            <Wallet className="w-6 h-6 text-[#2A84FF]" />
          </div>
          <h2 className="text-xl font-bold text-white">Wallet & partenaires Web3</h2>
        </div>
        <p className="text-white/80 mb-4 leading-relaxed">
          EazyBet utilise des <span className="font-bold text-white">wallets partenaires reconnus</span> pour la distribution des récompenses.
        </p>
        <div className="space-y-2 mb-4 ml-4">
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Aucun wallet interne à créer</span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Connexion simple via des solutions Web3 existantes</span>
          </div>
          <div className="flex items-start gap-2 text-white/80">
            <span className="mt-1">•</span>
            <span>Vous gardez le <span className="font-bold">contrôle total</span> de vos actifs</span>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="w-4 h-4 text-[#F5C144]" />
            <span>✨ Récompenses en cryptomonnaies réelles</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="w-4 h-4 text-[#F5C144]" />
            <span>✨ Univers Web3 accessible aux débutants</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="w-4 h-4 text-[#F5C144]" />
            <span>✨ NFTs et surprises à venir</span>
          </div>
        </div>
        <button
          onClick={() => setShowWalletModal(true)}
          className="w-full bg-gradient-to-r from-[#2A84FF] to-[#1A5FCC] hover:from-[#3A94FF] hover:to-[#2A6FDC] text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
        >
          👉 Connecter un wallet partenaire
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
