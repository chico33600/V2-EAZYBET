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

    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        created_at,
        sender:profiles!friendships_user_id_fkey(id, username, tokens, diamonds, won_bets)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get friend requests error:', error);
      return createErrorResponse('Failed to fetch friend requests', 500);
    }

    const formattedRequests = (requests || []).map((req: any) => ({
      friendship_id: req.id,
      sender_id: req.user_id,
      username: req.sender.username,
      tokens: req.sender.tokens,
      diamonds: req.sender.diamonds,
      won_bets: req.sender.won_bets,
      created_at: req.created_at
    }));

    return createSuccessResponse({
      requests: formattedRequests,
      count: formattedRequests.length
    });

  } catch (error: any) {
    console.error('Friend requests API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { friendshipId, action, userId } = body;

    if (!friendshipId || !action || !userId) {
      return createErrorResponse('Friendship ID, action, and user ID are required', 400);
    }

    if (!['accept', 'reject'].includes(action)) {
      return createErrorResponse('Action must be accept or reject', 400);
    }

    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch friendship error:', fetchError);
      return createErrorResponse('Failed to fetch friendship', 500);
    }

    if (!friendship) {
      return createErrorResponse('Friend request not found or already processed', 404);
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const { error: updateError } = await supabase
      .from('friendships')
      .update({ status: newStatus })
      .eq('id', friendshipId);

    if (updateError) {
      console.error('Update friendship error:', updateError);
      return createErrorResponse('Failed to update friend request', 500);
    }

    return createSuccessResponse({
      message: `Friend request ${action}ed`,
      status: newStatus
    });

  } catch (error: any) {
    console.error('Update friend request API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
