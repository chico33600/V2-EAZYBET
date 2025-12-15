'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Sport {
  id: string;
  name: string;
  icon: string;
  gradient: string;
}

const AVAILABLE_SPORTS: Sport[] = [
  {
    id: 'soccer',
    name: 'Football',
    icon: '⚽',
    gradient: 'from-green-600 to-green-800',
  },
  {
    id: 'nba',
    name: 'NBA - Basket',
    icon: '🏀',
    gradient: 'from-orange-600 to-orange-800',
  },
  {
    id: 'nfl',
    name: 'NFL - Football américain',
    icon: '🏈',
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    id: 'mma',
    name: 'MMA',
    icon: '🥋',
    gradient: 'from-red-600 to-red-800',
  },
];

interface OtherSportsButtonProps {
  currentSport: string;
  onSportSelect: (sportId: string) => void;
}

export function OtherSportsButton({ currentSport, onSportSelect }: OtherSportsButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSportClick = (sportId: string) => {
    onSportSelect(sportId);
    setIsExpanded(false);
  };

  const currentSportData = AVAILABLE_SPORTS.find(s => s.id === currentSport);

  return (
    <div className="px-4 pb-6">
      <motion.div
        initial={false}
        className="bg-[#1C2128] border border-[#30363D] rounded-2xl overflow-hidden"
      >
        {/* Bouton principal */}
        <button
          onClick={handleToggle}
          className="w-full p-4 flex items-center justify-between text-white hover:bg-[#30363D]/30 transition-colors duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C1322B] to-[#A02822] flex items-center justify-center text-xl">
              🏆
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Autres sports</p>
              <p className="text-xs text-gray-400">Découvrir plus de matchs</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-6 h-6 text-white/60" />
          </motion.div>
        </button>

        {/* Section dépliable */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-[#30363D]"
            >
              <div className="p-3 space-y-2">
                {AVAILABLE_SPORTS.map((sport) => {
                  const isActive = sport.id === currentSport;

                  return (
                    <motion.button
                      key={sport.id}
                      onClick={() => handleSportClick(sport.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all duration-200 ${
                        isActive
                          ? `bg-gradient-to-r ${sport.gradient} text-white shadow-lg`
                          : 'bg-[#0D1117] hover:bg-[#161B22] text-white/80 hover:text-white border border-[#30363D]'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                          isActive ? 'bg-white/20' : 'bg-[#1C2128]'
                        }`}
                      >
                        {sport.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-base">{sport.name}</p>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-white/80 mt-1"
                          >
                            Sport actuel
                          </motion.p>
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
                        >
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Message informatif */}
              <div className="px-4 pb-4">
                <div className="bg-[#0D1117] border border-[#30363D] rounded-xl p-3">
                  <p className="text-xs text-gray-400 text-center">
                    Plus de sports seront ajoutés prochainement !
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
