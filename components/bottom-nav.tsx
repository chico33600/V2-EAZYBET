'use client';

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

  return (
    <div className="nav-bottom-fixed glassmorphism border-t border-[#30363D] px-4 py-2 safe-area-bottom">
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
