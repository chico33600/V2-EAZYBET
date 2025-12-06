'use client';

import { useState, useEffect } from 'react';
import { X, Check, XCircle, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface FriendRequest {
  friendship_id: string;
  sender_id: string;
  username: string;
  tokens: number;
  diamonds: number;
  won_bets: number;
  created_at: string;
}

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestsChange?: () => void;
}

export function FriendRequestsModal({ isOpen, onClose, onRequestsChange }: FriendRequestsModalProps) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { profile } = useAuth();

  async function loadRequests() {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/friends/requests?userId=${profile.id}`);
      const data = await response.json();

      if (data.success) {
        setRequests(data.data.requests || []);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(friendshipId: string, action: 'accept' | 'reject') {
    if (!profile?.id) return;

    setProcessing(friendshipId);
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendshipId,
          action,
          userId: profile.id
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(action === 'accept' ? 'Ami ajouté' : 'Demande rejetée');
        setRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
        onRequestsChange?.();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessing(null);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen, profile?.id]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Demandes d'ami</h2>
                  <p className="text-sm text-white/70">{requests.length} en attente</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <motion.div
                    key={request.friendship_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{request.username}</p>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span>💎 {request.diamonds}</span>
                          <span>🏆 {request.won_bets} victoires</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequest(request.friendship_id, 'accept')}
                        disabled={processing === request.friendship_id}
                        className="flex-1 py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRequest(request.friendship_id, 'reject')}
                        disabled={processing === request.friendship_id}
                        className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Refuser
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
