'use client';

import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getLeaderboard } from '@/lib/api-client';

export default function ClassementPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    async function loadLeaderboard() {
      const data = await getLeaderboard(50);
      setPlayers(data);
      setLoading(false);
    }
    loadLeaderboard();
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-white/60';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-white text-center">Chargement du classement...</p>
      </div>
    );
  }

  const currentUserRank = players.find(p => p.id === profile?.id)?.rank || null;

  return (
    <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Classement</h1>
            <p className="text-sm text-white/50">Top joueurs par diamants</p>
          </div>
        </div>

        {profile && (
          <div className="glassmorphism rounded-3xl p-4 mb-6 border border-[#30363D]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C1322B] to-[#C1322B]/60 flex items-center justify-center text-2xl font-bold text-white">
                  {profile.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white font-semibold">{profile.username}</p>
                  <p className="text-sm text-white/50">Votre position</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-2xl">💎</span>
                  <span className="text-xl font-bold text-white">{profile.diamonds.toLocaleString()}</span>
                </div>
                {currentUserRank && (
                  <p className={`text-sm font-semibold ${getRankColor(currentUserRank)}`}>
                    #{currentUserRank}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.id}
              className={`glassmorphism rounded-2xl p-4 border transition-all ${
                player.id === profile?.id
                  ? 'border-[#C1322B] bg-[#C1322B]/10'
                  : 'border-[#30363D] hover:border-[#C1322B]/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                    player.rank === 1 ? 'from-yellow-500 to-yellow-600' :
                    player.rank === 2 ? 'from-gray-400 to-gray-500' :
                    player.rank === 3 ? 'from-orange-500 to-orange-600' :
                    'from-[#30363D] to-[#21262D]'
                  } flex items-center justify-center text-xl font-bold ${getRankColor(player.rank)}`}>
                    {player.rank <= 3 ? (
                      <span className="text-2xl">{getRankIcon(player.rank)}</span>
                    ) : (
                      <span className="text-sm">#{player.rank}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{player.username}</p>
                    <p className="text-xs text-white/50">{player.total_bets} paris • {player.win_rate}% de réussite</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💎</span>
                  <span className="text-lg font-bold text-white">
                    {player.diamonds.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-[#C1322B]/10 to-purple-500/10 border border-[#C1322B]/20">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-[#C1322B] mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-semibold mb-1">Comment gagner des diamants?</p>
              <p className="text-sm text-white/70">
                Gagnez des paris pour accumuler des diamants et grimper dans le classement!
                Plus votre cote est élevée, plus vous gagnez de diamants.
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
