import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        user:profiles!friendships_user_id_fkey(id, username, tokens, diamonds, won_bets),
        friend:profiles!friendships_friend_id_fkey(id, username, tokens, diamonds, won_bets)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Get friends error:', error);
      return createErrorResponse('Failed to fetch friends', 500);
    }

    const friends = (friendships || []).map((f: any) => {
      if (f.user_id === userId) {
        return {
          id: f.friend_id,
          username: f.friend.username,
          tokens: f.friend.tokens,
          diamonds: f.friend.diamonds,
          won_bets: f.friend.won_bets,
          friendship_id: f.id
        };
      } else {
        return {
          id: f.user_id,
          username: f.user.username,
          tokens: f.user.tokens,
          diamonds: f.user.diamonds,
          won_bets: f.user.won_bets,
          friendship_id: f.id
        };
      }
    });

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
      .from('friendships')
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
