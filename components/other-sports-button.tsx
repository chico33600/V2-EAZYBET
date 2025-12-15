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
    <div className="bg-[#0D1117] border-b border-[#30363D] overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 px-4 py-3 min-w-max">
        {AVAILABLE_SPORTS.map((sport) => {
          const isActive = sport.id === currentSport;

          return (
            <motion.button
              key={sport.id}
              onClick={() => onSportSelect(sport.id)}
              whileTap={{ scale: 0.95 }}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm
                transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? 'bg-gradient-to-r from-[#C1322B] to-[#A02822] text-white shadow-lg'
                    : 'bg-[#1C2128] text-white/60 hover:text-white hover:bg-[#30363D]/50'
                }
              `}
            >
              <span className="text-lg">{sport.icon}</span>
              <span>{sport.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeSport"
                  className="absolute inset-0 bg-gradient-to-r from-[#C1322B] to-[#A02822] rounded-full -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
