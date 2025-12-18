'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, Diamond, Sparkles } from 'lucide-react';

interface WinNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokensWon: number;
  diamondsWon: number;
}

export function WinNotificationModal({
  isOpen,
  onClose,
  tokensWon,
  diamondsWon
}: WinNotificationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-[#0D1117] via-[#161B22] to-[#0D1117] border-2 border-[#C1322B] shadow-2xl overflow-hidden">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                duration: 0.5
              }}
              className="relative py-8 px-6"
            >
              {/* Animated background effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {showConfetti && [...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: Math.random() * 100 + '%',
                      y: -20,
                      rotate: 0,
                      opacity: 1
                    }}
                    animate={{
                      y: '100vh',
                      rotate: 360,
                      opacity: 0
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      delay: Math.random() * 0.5,
                      ease: "easeOut"
                    }}
                    className="absolute"
                  >
                    <Sparkles
                      className={`w-4 h-4 ${
                        i % 3 === 0 ? 'text-yellow-400' :
                        i % 3 === 1 ? 'text-[#C1322B]' :
                        'text-blue-400'
                      }`}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Trophy icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  delay: 0.2
                }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 10, -10, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1
                    }}
                  >
                    <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                  </motion.div>

                  {/* Glow effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                    className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl -z-10"
                  />
                </div>
              </motion.div>

              {/* Win message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <motion.h2
                  animate={{
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity
                  }}
                  className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-[#C1322B] to-yellow-400 mb-2"
                >
                  GAGNÉ !
                </motion.h2>
                <p className="text-xl text-white/80 font-medium">
                  Félicitations !
                </p>
              </motion.div>

              {/* Rewards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4 mb-6"
              >
                {/* Tokens */}
                {tokensWon > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center justify-between bg-gradient-to-r from-[#C1322B]/20 to-[#A02822]/20 border border-[#C1322B]/30 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-[#C1322B]/20 p-2 rounded-lg">
                        <Coins className="w-6 h-6 text-yellow-400" />
                      </div>
                      <span className="text-white font-semibold">Jetons</span>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        delay: 0.7,
                        stiffness: 300
                      }}
                      className="text-2xl font-bold text-yellow-400"
                    >
                      +{tokensWon.toLocaleString()}
                    </motion.div>
                  </motion.div>
                )}

                {/* Diamonds */}
                {diamondsWon > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center justify-between bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Diamond className="w-6 h-6 text-cyan-400" />
                      </div>
                      <span className="text-white font-semibold">Diamants</span>
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        delay: 0.9,
                        stiffness: 300
                      }}
                      className="text-2xl font-bold text-cyan-400"
                    >
                      +{diamondsWon}
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#C1322B] to-[#A02822] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Continuer
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
