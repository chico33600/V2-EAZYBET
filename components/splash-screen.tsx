'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-purple-900 via-violet-950 to-black animate-fadeIn"
      style={{
        animation: isVisible ? 'none' : 'fadeOut 0.5s ease-out forwards',
      }}
    >
      <style jsx>{`
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex flex-col items-center justify-center gap-6">
        <div
          className="relative"
          style={{
            animation: 'scaleIn 0.5s ease-out, pulse 2s ease-in-out infinite',
          }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#C1322B] via-[#8A2BE2] to-[#007BFF] rounded-full blur-2xl opacity-50"
            style={{
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />

          <div className="relative">
            <Image
              src="/logo_ezbc_.png"
              alt="EazyBet Logo"
              width={120}
              height={120}
              className="rounded-full shadow-2xl"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-4xl font-bold text-white"
            style={{
              animation: 'scaleIn 0.5s ease-out 0.2s backwards',
            }}
          >
            EazyBet
          </h1>

          <p
            className="text-white/70 text-sm"
            style={{
              animation: 'scaleIn 0.5s ease-out 0.3s backwards',
            }}
          >
            Entrez dans le match et gagnez votre première crypto
          </p>

          <div
            className="flex gap-1 mt-4"
            style={{
              animation: 'scaleIn 0.5s ease-out 0.4s backwards',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gradient-to-r from-[#C1322B] via-[#8A2BE2] to-[#007BFF] rounded-full"
                style={{
                  animation: `pulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
