import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');

    if (!userId) {
      return createErrorResponse('User ID is required', 400);
    }

    if (search) {
      const { data: searchResults, error } = await supabase
        .rpc('search_users_by_username', {
          search_query: search,
          current_user_id: userId,
          limit_input: 20
        });

      if (error) {
        console.error('Search users error:', error);
        return createErrorResponse('Failed to search users', 500);
      }

      return createSuccessResponse({ users: searchResults || [] });
    }

    const { data: friends, error } = await supabase
      .rpc('get_user_friends', { user_id_input: userId });

    if (error) {
      console.error('Get friends error:', error);
      return createErrorResponse('Failed to fetch friends', 500);
    }

    return createSuccessResponse({ friends: friends || [] });

  } catch (error: any) {
    console.error('Friends API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId } = body;

    if (!userId || !friendId) {
      return createErrorResponse('User ID and Friend ID are required', 400);
    }

    if (userId === friendId) {
      return createErrorResponse('Cannot add yourself as a friend', 400);
    }

    const { data: existingFriend, error: checkError } = await supabase
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .maybeSingle();

    if (checkError) {
      console.error('Check existing friend error:', checkError);
      return createErrorResponse('Failed to check friendship', 500);
    }

    if (existingFriend) {
      return createErrorResponse('Already friends with this user', 400);
    }

    const { data, error } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendId
      })
      .select()
      .single();

    if (error) {
      console.error('Add friend error:', error);
      return createErrorResponse('Failed to add friend', 500);
    }

    return createSuccessResponse({ friend: data });

  } catch (error: any) {
    console.error('Add friend API error:', error);
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
