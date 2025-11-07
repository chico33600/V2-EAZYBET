'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { earnTokens } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface TapToEarnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
}

interface FlyingCoin {
  id: number;
  startX: number;
  startY: number;
}

interface ActiveTouch {
  id: number;
  startTime: number;
}

export function TapToEarnModal({ open, onOpenChange }: TapToEarnModalProps) {
  const [tapCount, setTapCount] = useState(0);
  const [activeTaps, setActiveTaps] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [rotationKey, setRotationKey] = useState(0);
  const [flyingCoins, setFlyingCoins] = useState<FlyingCoin[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const { refreshProfile, updateTokensOptimistic, profile } = useAuth();

  const tapAreaRef = useRef<HTMLDivElement>(null);
  const activeTouchesRef = useRef<Map<number, ActiveTouch>>(new Map());
  const lastTapTimeRef = useRef<number>(0);
  const supportsHaptics = useRef<boolean>(false);

  useEffect(() => {
    supportsHaptics.current = 'vibrate' in navigator;
  }, []);

  const triggerHapticFeedback = useCallback(() => {
    if (supportsHaptics.current) {
      try {
        navigator.vibrate(10);
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    }
  }, []);

  const createFloatingText = useCallback((x: number, y: number) => {
    const newFloatingText: FloatingText = {
      id: Date.now() + Math.random(),
      x,
      y,
    };

    setFloatingTexts((prev) => [...prev, newFloatingText]);

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((text) => text.id !== newFloatingText.id));
    }, 800);
  }, []);

  const createRipple = useCallback((x: number, y: number, element: HTMLElement) => {
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  const processTap = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 50) return;
    lastTapTimeRef.current = now;

    setTapCount((prev) => prev + 1);
    setActiveTaps((prev) => Math.min(prev + 1, 3));
    setRotationKey((prev) => prev + 1);

    createFloatingText(x, y);

    if (tapAreaRef.current) {
      createRipple(x, y, tapAreaRef.current);
    }

    triggerHapticFeedback();

    setTimeout(() => {
      setActiveTaps((prev) => Math.max(0, prev - 1));
    }, 300);
  }, [createFloatingText, createRipple, triggerHapticFeedback]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isCollecting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    processTap(x, y);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isCollecting) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touches = Array.from(e.touches);

    for (const touch of touches) {
      const touchId = touch.identifier;

      if (activeTouchesRef.current.size >= 3) break;

      if (!activeTouchesRef.current.has(touchId)) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        activeTouchesRef.current.set(touchId, {
          id: touchId,
          startTime: Date.now(),
        });

        processTap(x, y);
      }
    }
  }, [processTap, isCollecting]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    const changedTouches = Array.from(e.changedTouches);

    for (const touch of changedTouches) {
      activeTouchesRef.current.delete(touch.identifier);
    }
  }, []);

  const handleTouchCancel = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    const changedTouches = Array.from(e.changedTouches);

    for (const touch of changedTouches) {
      activeTouchesRef.current.delete(touch.identifier);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      activeTouchesRef.current.clear();
      setTapCount(0);
      setActiveTaps(0);
      setFloatingTexts([]);
      setFlyingCoins([]);
      setIsCollecting(false);
      setShowButton(true);
    }
  }, [open]);

  const handleCollect = async () => {
    if (isCollecting || tapCount === 0) return;

    setIsCollecting(true);
    setShowButton(false);

    const tokensToEarn = tapCount * 1;

    try {
      console.log(`[Tap-to-Earn] Starting collection: ${tapCount} taps = ${tokensToEarn} tokens`);
      console.log('[Tap-to-Earn] Current profile tokens:', profile?.tokens);

      const result = await earnTokens(tapCount);
      console.log('[Tap-to-Earn] API result:', JSON.stringify(result));

      console.log('[Tap-to-Earn] Refreshing profile...');
      await refreshProfile();
      console.log('[Tap-to-Earn] Profile refreshed, new balance should be:', result.new_balance);

      const coinCount = 5;
      const newCoins: FlyingCoin[] = [];

      for (let i = 0; i < coinCount; i++) {
        newCoins.push({
          id: Date.now() + Math.random() + i,
          startX: 0,
          startY: 0,
        });
      }

      setFlyingCoins(newCoins);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tokens-earned', {
          detail: { amount: tokensToEarn }
        }));
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      setFlyingCoins([]);
      setIsCollecting(false);
      setTapCount(0);
      setShowButton(true);
      onOpenChange(false);

      console.log('[Tap-to-Earn] Collection complete');
    } catch (error: any) {
      console.error('[Tap-to-Earn] Error earning tokens:', error);
      console.error('[Tap-to-Earn] Error details:', error.message);

      setIsCollecting(false);
      setShowButton(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700/50 text-white max-w-md backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Gagnez des Jetons
          </DialogTitle>
          <p className="text-slate-400 text-center text-sm mt-2">
            Tapez rapidement pour accumuler des récompenses
          </p>
        </DialogHeader>

        <div className="py-10">
          <motion.div
            className="text-center mb-8 relative"
            animate={{
              scale: tapCount > 0 ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 blur-2xl bg-yellow-400/20 rounded-full"></div>
            <p className="text-6xl font-black bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg relative z-10">
              {tapCount}
            </p>
            <p className="text-slate-400 mt-3 text-sm font-medium tracking-wide uppercase relative z-10">
              Jetons gagnés
            </p>
          </motion.div>

          <motion.div
            ref={tapAreaRef}
            onClick={handleTap}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="relative mx-auto w-56 h-56 rounded-full cursor-pointer select-none flex items-center justify-center overflow-visible"
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none',
              WebkitTouchCallout: 'none',
            }}
            whileHover={{
              scale: 1.02,
            }}
            whileTap={{
              scale: 0.98,
            }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/30 via-orange-400/20 to-red-400/30 blur-2xl animate-pulse"></div>

            <motion.div
              key={rotationKey}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-white to-slate-100 p-8 shadow-2xl"
              style={{
                boxShadow: '0 0 0 4px rgba(245, 193, 68, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
              initial={{
                scale: 1,
              }}
              animate={{
                rotateZ: 360,
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 4px rgba(245, 193, 68, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)',
                  '0 0 0 8px rgba(245, 193, 68, 0.5), 0 0 80px rgba(245, 193, 68, 0.6), 0 20px 80px rgba(0, 0, 0, 0.5)',
                  '0 0 0 4px rgba(245, 193, 68, 0.2), 0 20px 60px rgba(0, 0, 0, 0.5)',
                ],
              }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
              }}
            >
              <Image
                src="/Logo EZBC .png"
                alt="EZBC Logo"
                width={160}
                height={160}
                className="pointer-events-none drop-shadow-lg"
                priority
              />
            </motion.div>

            <AnimatePresence>
              {floatingTexts.map((text) => (
                <motion.div
                  key={text.id}
                  className="absolute text-3xl font-black pointer-events-none"
                  style={{
                    left: text.x,
                    top: text.y,
                    background: 'linear-gradient(135deg, #FDE047, #FACC15, #F59E0B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 12px rgba(245, 193, 68, 0.9))',
                  }}
                  initial={{
                    opacity: 1,
                    y: 0,
                    scale: 0.8,
                  }}
                  animate={{
                    opacity: 0,
                    y: -50,
                    scale: 1.4,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  +1
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <motion.p
            className="text-center text-slate-400 mt-8 text-sm font-medium"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            Tapez avec jusqu'à 3 doigts pour gagner plus vite
          </motion.p>

          <AnimatePresence>
            {activeTaps > 0 && (
              <motion.div
                className="text-center mt-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                  <div className="flex gap-1">
                    {[...Array(activeTaps)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-purple-400"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      />
                    ))}
                  </div>
                  <p className="text-purple-300 font-bold text-xs">
                    {activeTaps} doigt{activeTaps > 1 ? 's' : ''} actif{activeTaps > 1 ? 's' : ''}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tapCount > 0 && showButton && (
            <motion.div
              className="flex justify-center mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                onClick={handleCollect}
                className="relative px-6 py-3 text-white font-bold text-sm rounded-full overflow-hidden shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #C1322B, #8A2BE2, #007BFF)',
                }}
                whileHover={{
                  scale: 1.05,
                  background: 'linear-gradient(135deg, #E03E34, #A040F0, #1A8FFF)',
                  boxShadow: '0 0 25px rgba(138, 43, 226, 0.7), 0 10px 30px rgba(0, 0, 0, 0.4)',
                }}
                whileTap={{
                  scale: 0.95,
                }}
                disabled={isCollecting}
              >
                <span className="relative z-10">Récupérer tes jetons</span>
              </motion.button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {flyingCoins.map((coin, index) => (
            <motion.div
              key={coin.id}
              className="absolute w-6 h-6 rounded-full pointer-events-none z-50"
              style={{
                background: 'linear-gradient(135deg, #FDE047, #F59E0B)',
                boxShadow: '0 0 15px rgba(245, 193, 68, 0.8)',
                left: '50%',
                bottom: '20%',
              }}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: 0,
                x: 200 + index * 10,
                y: -250 - index * 15,
                scale: 1.2,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: 'easeOut',
              }}
            />
          ))}
        </AnimatePresence>

        <style jsx>{`
          .tap-ripple {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(245, 193, 68, 0.8) 0%, rgba(255, 107, 0, 0.4) 50%, transparent 100%);
            width: 30px;
            height: 30px;
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
            transform: translate(-50%, -50%);
            filter: blur(4px);
          }

          @keyframes ripple-animation {
            0% {
              transform: translate(-50%, -50%) scale(0);
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
            100% {
              transform: translate(-50%, -50%) scale(5);
              opacity: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
