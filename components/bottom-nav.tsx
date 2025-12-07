'use client';

import { useState, useEffect } from 'react';
import { Home, User, Trophy, Gift } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Trophy, label: 'Classement', path: '/classement' },
  { icon: Gift, label: 'Airdrop', path: '/airdrop' },
  { icon: User, label: 'Profil', path: '/profil' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(true);

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 2000);

      setScrollTimeout(timeout);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  return (
    <div
      className={`nav-bottom-fixed glassmorphism border-t border-[#30363D] px-4 py-2 safe-area-bottom transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all active:scale-95
                ${isActive ? 'text-[#C1322B]' : 'text-white/50 hover:text-white'}`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-[#C1322B]/10' : ''}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
