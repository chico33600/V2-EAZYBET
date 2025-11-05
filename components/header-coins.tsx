'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Coins, Diamond } from 'lucide-react';

interface HeaderCoinsProps {
  onCoinsClick?: () => void;
}

export function HeaderCoins({ onCoinsClick }: HeaderCoinsProps) {
  const [mounted, setMounted] = useState(false);
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const coins = mounted && profile ? profile.tokens : 0;
  const diamonds = mounted && profile ? profile.diamonds : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 pb-3 header-blur border-b border-[#30363D]/30">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <button
          onClick={() => router.push('/profil')}
          aria-label="Aller au profil"
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C1322B] to-[#8B1F1A] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
        >
          <span className="text-white font-bold text-lg">
            {profile?.username?.charAt(0).toUpperCase() || 'U'}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onCoinsClick}
            aria-label="Cliquer pour gagner des jetons"
            className="flex items-center gap-1.5 bg-[#1C2128]/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-[#30363D] hover:bg-[#1C2128] hover:border-[#F5C144]/30 transition-all active:scale-95"
          >
            <Coins size={16} className="text-[#F5C144]" />
            <span className="text-white font-bold text-xs">{coins.toFixed(0)}</span>
          </button>

          <button
            onClick={() => router.push('/airdrop')}
            aria-label="Aller à l'airdrop"
            className="flex items-center gap-1.5 bg-[#1C2128]/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-[#30363D] hover:bg-[#1C2128] hover:border-[#2A84FF]/30 transition-all active:scale-95"
          >
            <Diamond size={16} className="text-[#2A84FF] fill-[#2A84FF]" />
            <span className="text-white font-bold text-xs">{diamonds}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
