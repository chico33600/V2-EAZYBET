'use client';

import Link from 'next/link';
import { Coins, Users, Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { memo } from 'react';

type BannerType = 'token' | 'friends' | 'global';

interface PromoBannerProps {
  type: BannerType;
}

const bannerConfig = {
  token: {
    icon: Sparkles,
    title: "🔥 EazyBetcoin arrive bientôt !",
    subtitle: "Prépare-toi à collectionner les premiers tokens du jeu.",
    description: "Les joueurs les plus actifs auront un avantage stratégique.",
    cta: "En savoir plus",
    href: "/airdrop",
    gradient: "from-purple-600 via-pink-600 to-purple-600",
    glowColor: "rgba(168, 85, 247, 0.4)",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  friends: {
    icon: Users,
    title: "💥 Dépasse tes amis !",
    subtitle: "Va dans l'onglet Amis pour voir qui domine la saison.",
    description: "",
    cta: "Voir mes amis",
    href: "/classement?tab=friends",
    gradient: "from-red-600 via-purple-600 to-red-600",
    glowColor: "rgba(239, 68, 68, 0.4)",
    bgGradient: "from-red-500/10 to-purple-500/10",
  },
  global: {
    icon: Trophy,
    title: "🏆 Classement Global : es-tu éligible au prochain airdrop ?",
    subtitle: "Consulte ton classement en temps réel.",
    description: "",
    cta: "Voir mon classement",
    href: "/classement?tab=global",
    gradient: "from-amber-600 via-purple-600 to-amber-600",
    glowColor: "rgba(245, 158, 11, 0.4)",
    bgGradient: "from-amber-500/10 to-purple-500/10",
  },
};

function PromoBannerComponent({ type }: PromoBannerProps) {
  const config = bannerConfig[type];
  const Icon = config.icon;

  return (
    <Link href={config.href} className="block my-6">
      <div
        className={`relative bg-gradient-to-br ${config.bgGradient} border border-white/10 rounded-2xl p-6 overflow-hidden group hover:border-white/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer`}
        style={{
          boxShadow: `0 0 30px ${config.glowColor}`,
        }}
      >
        {/* Animated background gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
        />

        {/* Animated glow effect */}
        <div
          className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 -z-10`}
        />

        <div className="relative flex items-center gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base mb-1 leading-tight">
              {config.title}
            </h3>
            <p className="text-white/70 text-sm leading-tight mb-1">
              {config.subtitle}
            </p>
            {config.description && (
              <p className="text-white/50 text-xs leading-tight">
                {config.description}
              </p>
            )}
          </div>

          {/* CTA Button */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className={`hidden sm:inline-block text-sm font-bold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
              {config.cta}
            </span>
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -z-10" />
      </div>
    </Link>
  );
}

export const PromoBanner = memo(PromoBannerComponent);
