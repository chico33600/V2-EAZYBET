'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Search, Copy, Gift, UserPlus, X, Trophy, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';

interface Friend {
  friend_id: string;
  username: string;
  avatar_url: string | null;
  leaderboard_score: number;
  created_at: string;
}

interface SearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  leaderboard_score: number;
  is_friend: boolean;
}

interface FriendsModalProps {
  open: boolean;
  onClose: () => void;
}

export function FriendsModal({ open, onClose }: FriendsModalProps) {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    if (open && profile?.id) {
      loadFriends();
      loadReferralData();
    }
  }, [open, profile?.id]);

  useEffect(() => {
    if (searchQuery.trim() && profile?.id) {
      const timer = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, profile?.id]);

  async function loadFriends() {
    if (!profile?.id) return;

    try {
      const response = await fetch(`/api/friends?userId=${profile.id}`);
      const data = await response.json();

      if (data.success) {
        setFriends(data.data.friends || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  async function loadReferralData() {
    if (!profile?.id) return;

    try {
      const response = await fetch(`/api/referrals?userId=${profile.id}`);
      const data = await response.json();

      if (data.success) {
        setReferralLink(data.data.referralLink);
        setReferralCount(data.data.referralCount);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    }
  }

  async function searchUsers() {
    if (!profile?.id || !searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/friends?userId=${profile.id}&search=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addFriend(friendId: string) {
    if (!profile?.id) return;

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, friendId })
      });

      const data = await response.json();

      if (data.success) {
        loadFriends();
        setSearchResults(prev =>
          prev.map(user =>
            user.user_id === friendId ? { ...user, is_friend: true } : user
          )
        );
      }
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  }

  async function removeFriend(friendId: string) {
    if (!profile?.id) return;

    try {
      const response = await fetch(`/api/friends?userId=${profile.id}&friendId=${friendId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setFriends(prev => prev.filter(f => f.friend_id !== friendId));
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  }

  function copyReferralLink() {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#C1322B] via-[#8A2BE2] to-[#007BFF]">
              <User className="w-6 h-6 text-white" />
            </div>
            Amis & Parrainage
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="friends" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C1322B] data-[state=active]:to-[#8A2BE2]">
              Mes amis ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C1322B] data-[state=active]:to-[#8A2BE2]">
              Trouver
            </TabsTrigger>
            <TabsTrigger value="referral" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#C1322B] data-[state=active]:to-[#8A2BE2]">
              Parrainage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-3">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 mb-2">Aucun ami pour le moment</p>
                <p className="text-sm text-slate-500">Cherchez des utilisateurs pour les ajouter</p>
              </div>
            ) : (
              <AnimatePresence>
                {friends.map((friend, index) => (
                  <motion.div
                    key={friend.friend_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C1322B] to-[#8A2BE2] flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{friend.username}</p>
                        <p className="text-sm text-yellow-400">{friend.leaderboard_score.toLocaleString()} 💎</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeFriend(friend.friend_id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par pseudo..."
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-[#C1322B] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400 mt-2">Recherche...</p>
                </div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400">Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <AnimatePresence>
                  {searchResults.map((user, index) => (
                    <motion.div
                      key={user.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{user.username}</p>
                          <p className="text-sm text-yellow-400">{user.leaderboard_score.toLocaleString()} 💎</p>
                        </div>
                      </div>
                      {user.is_friend ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <Check className="w-4 h-4" />
                          Ami
                        </div>
                      ) : (
                        <Button
                          onClick={() => addFriend(user.user_id)}
                          size="sm"
                          className="bg-gradient-to-r from-[#C1322B] via-[#8A2BE2] to-[#007BFF] hover:opacity-90"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Ajouter
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>

          <TabsContent value="referral" className="mt-4 space-y-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#C1322B]/20 via-[#8A2BE2]/20 to-[#007BFF]/20 border border-[#C1322B]/30">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-8 h-8 text-yellow-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Parraine tes amis!</h3>
                  <p className="text-sm text-slate-300">Gagnez 10 💎 chacun</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-slate-300 mb-2">Ton lien de parrainage:</p>
                  <div className="flex gap-2">
                    <Input
                      value={referralLink}
                      readOnly
                      className="flex-1 bg-slate-900/50 border-slate-700 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={copyReferralLink}
                      className="bg-gradient-to-r from-[#C1322B] to-[#8A2BE2] hover:opacity-90"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copié!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copier
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
                  <div className="flex items-start gap-3">
                    <Trophy className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-white font-semibold mb-2">Comment ça marche?</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        <li>• Ton ami s'inscrit avec ton lien</li>
                        <li>• Il reçoit 10 💎 de bienvenue</li>
                        <li>• Tu reçois aussi 10 💎 de récompense</li>
                        <li>• Illimité! Plus tu parraines, plus tu gagnes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="text-center p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                  <p className="text-sm text-slate-400">Amis parrainés</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-[#C1322B] via-[#8A2BE2] to-[#007BFF] bg-clip-text text-transparent">
                    {referralCount}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
