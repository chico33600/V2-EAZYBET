import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const searchQuery = searchParams.get('search');

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    if (searchQuery) {
      const { data: allUsers, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, leaderboard_score, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', userId)
        .limit(20);

      if (searchError) {
        console.error('Search users error:', searchError);
        return createErrorResponse('Failed to search users', 500);
      }

      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId);

      if (friendsError) {
        console.error('Get friends error:', friendsError);
        return createErrorResponse('Failed to get friends', 500);
      }

      const { data: pendingRequests, error: pendingError } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Get pending requests error:', pendingError);
        return createErrorResponse('Failed to get pending requests', 500);
      }

      const friendshipMap = new Map();
      (friendsData || []).forEach((f: any) => {
        friendshipMap.set(f.friend_id, 'accepted');
      });

      (pendingRequests || []).forEach((f: any) => {
        const otherId = f.user_id === userId ? f.friend_id : f.user_id;
        if (f.user_id === userId) {
          friendshipMap.set(otherId, 'pending_sent');
        } else {
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

      return createSuccessResponse({ users });
    }

    const { data: friendsData, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        created_at,
        friend:profiles!friends_friend_id_fkey(id, username, leaderboard_score, avatar_url)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Get friends error:', error);
      return createErrorResponse('Failed to fetch friends', 500);
    }

    const friends = (friendsData || []).map((f: any) => ({
      friend_id: f.friend_id,
      username: f.friend.username,
      leaderboard_score: f.friend.leaderboard_score,
      avatar_url: f.friend.avatar_url,
      created_at: f.created_at
    }));

    return createSuccessResponse({ friends });

  } catch (error: any) {
    console.error('Friends API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, targetUserId } = body;

    if (!userId || !targetUserId) {
      return createErrorResponse('User ID and Target User ID are required', 400);
    }

    if (userId === targetUserId) {
      return createErrorResponse('Cannot add yourself as a friend', 400);
    }

    const { data: existing, error: checkError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${userId})`)
      .maybeSingle();

    if (checkError) {
      console.error('Check existing friendship error:', checkError);
      return createErrorResponse('Failed to check friendship', 500);
    }

    if (existing) {
      if (existing.status === 'accepted') {
        return createErrorResponse('Already friends with this user', 400);
      } else if (existing.status === 'pending') {
        return createErrorResponse('Friend request already sent', 400);
      }
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: targetUserId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Send friend request error:', error);
      return createErrorResponse('Failed to send friend request', 500);
    }

    return createSuccessResponse({
      message: 'Friend request sent',
      friendship: data
    });

  } catch (error: any) {
    console.error('Send friend request API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const friendId = searchParams.get('friendId');

    if (!userId || !friendId) {
      return createErrorResponse('User ID and Friend ID are required', 400);
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

    if (error) {
      console.error('Remove friend error:', error);
      return createErrorResponse('Failed to remove friend', 500);
    }

    return createSuccessResponse({ message: 'Friend removed successfully' });

  } catch (error: any) {
    console.error('Remove friend API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
