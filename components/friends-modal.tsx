'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Search, Copy, Gift, UserPlus, X, Trophy, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase-client';

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
  friendship_status: 'none' | 'accepted' | 'pending_sent' | 'pending_received';
}

interface FriendRequest {
  friendship_id: string;
  sender_id: string;
  username: string;
  diamonds: number;
  created_at: string;
}

interface SentRequest {
  friendship_id: string;
  receiver_id: string;
  username: string;
  leaderboard_score: number;
  created_at: string;
}

interface FriendsModalProps {
  open: boolean;
  onClose: () => void;
}

export function FriendsModal({ open, onClose }: FriendsModalProps) {
  const { profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
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
      loadFriendRequests();
      loadSentRequests();
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
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          friend_id,
          created_at,
          user:profiles!friendships_user_id_fkey(id, username, leaderboard_score, avatar_url),
          friend:profiles!friendships_friend_id_fkey(id, username, leaderboard_score, avatar_url)
        `)
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error loading friends:', error);
        return;
      }

      const friends = (friendships || []).map((f: any) => {
        if (f.user_id === profile.id) {
          return {
            friend_id: f.friend_id,
            username: f.friend.username,
            leaderboard_score: f.friend.leaderboard_score,
            avatar_url: f.friend.avatar_url,
            created_at: f.created_at
          };
        } else {
          return {
            friend_id: f.user_id,
            username: f.user.username,
            leaderboard_score: f.user.leaderboard_score,
            avatar_url: f.user.avatar_url,
            created_at: f.created_at
          };
        }
      });

      setFriends(friends);
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

  async function loadFriendRequests() {
    if (!profile?.id) return;

    try {
      const { data: requests, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          created_at,
          sender:profiles!friendships_user_id_fkey(id, username, diamonds)
        `)
        .eq('friend_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading friend requests:', error);
        return;
      }

      const formattedRequests = (requests || []).map((req: any) => ({
        friendship_id: req.id,
        sender_id: req.user_id,
        username: req.sender.username,
        diamonds: req.sender.diamonds,
        created_at: req.created_at
      }));

      setFriendRequests(formattedRequests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  }

  async function loadSentRequests() {
    if (!profile?.id) return;

    try {
      const { data: requests, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          created_at,
          receiver:profiles!friendships_friend_id_fkey(id, username, leaderboard_score)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading sent requests:', error);
        return;
      }

      const formattedRequests = (requests || []).map((req: any) => ({
        friendship_id: req.id,
        receiver_id: req.friend_id,
        username: req.receiver.username,
        leaderboard_score: req.receiver.leaderboard_score,
        created_at: req.created_at
      }));

      setSentRequests(formattedRequests);
    } catch (error) {
      console.error('Error loading sent requests:', error);
    }
  }

  async function searchUsers() {
    if (!profile?.id || !searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data: allUsers, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, leaderboard_score, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', profile.id)
        .limit(20);

      if (searchError) {
        console.error('Search users error:', searchError);
        setLoading(false);
        return;
      }

      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);

      if (friendshipsError) {
        console.error('Get friendships error:', friendshipsError);
        setLoading(false);
        return;
      }

      const friendshipMap = new Map();
      (friendships || []).forEach((f: any) => {
        const otherId = f.user_id === profile.id ? f.friend_id : f.user_id;
        if (f.status === 'accepted') {
          friendshipMap.set(otherId, 'accepted');
        } else if (f.status === 'pending' && f.user_id === profile.id) {
          friendshipMap.set(otherId, 'pending_sent');
        } else if (f.status === 'pending' && f.friend_id === profile.id) {
          friendshipMap.set(otherId, 'pending_received');
        }
      });

      const users = (allUsers || []).map((user: any) => ({
        user_id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
        leaderboard_score: user.leaderboard_score,
        is_friend: friendshipMap.get(user.id) === 'accepted',
        friendship_status: friendshipMap.get(user.id) || 'none'
      }));

      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addFriend(friendId: string) {
    if (!profile?.id) return;

    try {
      const { data: existing, error: checkError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${profile.id})`)
        .maybeSingle();

      if (checkError) {
        console.error('Check existing friendship error:', checkError);
        return;
      }

      if (existing) {
        console.log('Friendship already exists');
        return;
      }

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: profile.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) {
        console.error('Send friend request error:', error);
        return;
      }

      setSearchResults(prev =>
        prev.map(user =>
          user.user_id === friendId ? { ...user, friendship_status: 'pending_sent' } : user
        )
      );
      loadSentRequests();
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  }

  async function handleFriendRequest(friendshipId: string, action: 'accept' | 'reject') {
    if (!profile?.id) return;

    try {
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .eq('friend_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError || !friendship) {
        console.error('Fetch friendship error:', fetchError);
        return;
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';

      const { error: updateError } = await supabase
        .from('friendships')
        .update({ status: newStatus })
        .eq('id', friendshipId);

      if (updateError) {
        console.error('Update friendship error:', updateError);
        return;
      }

      loadFriendRequests();
      loadSentRequests();
      loadFriends();
      if (searchQuery) {
        searchUsers();
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  }

  async function removeFriend(friendId: string) {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${profile.id})`);

      if (error) {
        console.error('Remove friend error:', error);
        return;
      }

      setFriends(prev => prev.filter(f => f.friend_id !== friendId));
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

          <TabsContent value="friends" className="mt-4 space-y-4">
            {friendRequests.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Demandes d'amis reçues ({friendRequests.length})
                </h3>
                <AnimatePresence>
                  {friendRequests.map((request, index) => (
                    <motion.div
                      key={request.friendship_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C1322B] to-[#8A2BE2] flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{request.username}</p>
                          <p className="text-sm text-yellow-400">{request.diamonds.toLocaleString()} 💎</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleFriendRequest(request.friendship_id, 'accept')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          onClick={() => handleFriendRequest(request.friendship_id, 'reject')}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {friends.length === 0 && friendRequests.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 mb-2">Aucun ami pour le moment</p>
                <p className="text-sm text-slate-500">Cherchez des utilisateurs pour les ajouter</p>
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Mes amis ({friends.length})
                </h3>
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
              </div>
            ) : null}
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

            {sentRequests.length > 0 && (
              <div className="space-y-3 mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Demandes envoyées ({sentRequests.length})
                </h3>
                <AnimatePresence>
                  {sentRequests.map((request, index) => (
                    <motion.div
                      key={request.friendship_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{request.username}</p>
                          <p className="text-sm text-yellow-400">{request.leaderboard_score.toLocaleString()} 💎</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <User className="w-4 h-4" />
                        En attente
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

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
                      {user.friendship_status === 'accepted' ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <Check className="w-4 h-4" />
                          Ami
                        </div>
                      ) : user.friendship_status === 'pending_sent' ? (
                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                          <User className="w-4 h-4" />
                          En attente
                        </div>
                      ) : user.friendship_status === 'pending_received' ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const request = friendRequests.find(r => r.sender_id === user.user_id);
                              if (request) handleFriendRequest(request.friendship_id, 'accept');
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              const request = friendRequests.find(r => r.sender_id === user.user_id);
                              if (request) handleFriendRequest(request.friendship_id, 'reject');
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
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
