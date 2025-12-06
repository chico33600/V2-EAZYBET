'use client';

import { useState, useEffect } from 'react';
import { Trophy, Users, Globe, Bell, UserPlus } from 'lucide-react';
import { LeaderboardList } from '@/components/leaderboard-list';
import { FriendRequestsModal } from '@/components/friend-requests-modal';
import { FriendsModal } from '@/components/friends-modal';
import { useAuth } from '@/lib/auth-context';

export default function ClassementPage() {
  const [viewMode, setViewMode] = useState<'global' | 'friends'>('global');
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const { profile } = useAuth();

  async function loadRequestsCount() {
    if (!profile?.id) return;

    try {
      const response = await fetch(`/api/friends/requests?userId=${profile.id}`);
      const data = await response.json();

      if (data.success) {
        setRequestsCount(data.data.count || 0);
      }
    } catch (error) {
      console.error('Error loading requests count:', error);
    }
  }

  useEffect(() => {
    loadRequestsCount();
    const interval = setInterval(loadRequestsCount, 30000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Classement</h1>
          <p className="text-sm text-white/50">Top joueurs par diamants</p>
        </div>
        {requestsCount > 0 && (
          <button
            onClick={() => setShowRequestsModal(true)}
            className="relative p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
          >
            <Bell className="w-6 h-6 text-purple-400" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {requestsCount}
            </span>
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('global')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'global'
              ? 'bg-gradient-to-r from-[#C1322B] to-[#8A2BE2] text-white'
              : 'bg-slate-800/50 text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Global
        </button>
        <button
          onClick={() => setViewMode('friends')}
          className={`relative flex-1 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'friends'
              ? 'bg-gradient-to-r from-[#C1322B] to-[#8A2BE2] text-white'
              : 'bg-slate-800/50 text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Amis
          {requestsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {requestsCount}
            </span>
          )}
        </button>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowFriendsModal(true)}
          className="relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#C1322B]/20 via-[#8A2BE2]/20 to-[#007BFF]/20 border-2 border-[#C1322B]/30 hover:border-[#C1322B]/50 transition-all flex items-center justify-center gap-3 group"
        >
          <UserPlus className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          <span className="text-white font-bold text-lg">Amis & Parrainage</span>
          {requestsCount > 0 && (
            <span className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
              {requestsCount}
            </span>
          )}
        </button>
      </div>

      <LeaderboardList key={leaderboardKey} viewMode={viewMode} />

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

      <FriendRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        onRequestsChange={() => {
          loadRequestsCount();
          setLeaderboardKey(prev => prev + 1);
        }}
      />

      <FriendsModal
        open={showFriendsModal}
        onClose={() => {
          setShowFriendsModal(false);
          loadRequestsCount();
          setLeaderboardKey(prev => prev + 1);
        }}
      />
    </div>
  );
}
