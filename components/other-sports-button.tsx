'use client';

import { motion } from 'framer-motion';

interface Sport {
  id: string;
  name: string;
  icon: string;
}

const AVAILABLE_SPORTS: Sport[] = [
  {
    id: 'soccer',
    name: 'Football',
    icon: '⚽',
  },
  {
    id: 'nba',
    name: 'Basket',
    icon: '🏀',
  },
  {
    id: 'nfl',
    name: 'Football US',
    icon: '🏈',
  },
  {
    id: 'mma',
    name: 'MMA',
    icon: '🥋',
  },
];

interface OtherSportsButtonProps {
  currentSport: string;
  onSportSelect: (sportId: string) => void;
}

export function OtherSportsButton({ currentSport, onSportSelect }: OtherSportsButtonProps) {
  return (
    <div className="bg-[#0D1117]/50 border-b border-[#30363D]/30 overflow-x-auto scrollbar-hide backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 min-w-max">
        {AVAILABLE_SPORTS.map((sport) => {
          const isActive = sport.id === currentSport;

          return (
            <motion.button
              key={sport.id}
              onClick={() => onSportSelect(sport.id)}
              whileTap={{ scale: 0.96 }}
              className={`
                relative flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs
                transition-all duration-300 whitespace-nowrap
                ${
                  isActive
                    ? 'text-white'
                    : 'text-white/40 hover:text-white/70'
                }
              `}
            >
              <span className="text-sm">{sport.icon}</span>
              <span className="tracking-wide">{sport.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeSport"
                  className="absolute inset-0 bg-gradient-to-r from-[#C1322B]/20 to-[#A02822]/20 rounded-full border border-[#C1322B]/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
