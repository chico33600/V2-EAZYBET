import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[Leaderboard API] Starting request...');
    console.log('[Leaderboard API] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[Leaderboard API] Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const friendsOnly = searchParams.get('friendsOnly') === 'true';

    console.log('[Leaderboard API] Params:', { limit, offset, userId, friendsOnly });

    if (userId && !friendsOnly) {
      console.log('[Leaderboard API] Fetching user rank for:', userId);
      const { data: userRank, error: rankError } = await supabase
        .rpc('get_user_rank', { user_id_input: userId });

      if (rankError) {
        console.error('User rank fetch error:', rankError);
        return createErrorResponse('Failed to fetch user rank', 500);
      }

      const userRankData = userRank && userRank.length > 0 ? userRank[0] : null;

      return createSuccessResponse({
        user_rank: userRankData ? {
          rank: Number(userRankData.rank),
          user_id: userRankData.user_id,
          username: userRankData.username,
          avatar_url: userRankData.avatar_url,
          score: Number(userRankData.leaderboard_score),
          win_rate: Number(userRankData.win_rate),
        } : null,
      });
    }

    let leaderboardData, error;

    console.log('[Leaderboard API] Fetching leaderboard data...');

    if (friendsOnly && userId) {
      console.log('[Leaderboard API] Using friends leaderboard');
      const result = await supabase
        .rpc('get_friends_leaderboard', {
          user_id_input: userId,
          limit_input: limit,
          offset_input: offset
        });
      leaderboardData = result.data;
      error = result.error;
    } else {
      console.log('[Leaderboard API] Using global leaderboard');
      const result = await supabase
        .rpc('get_leaderboard', {
          limit_input: limit,
          offset_input: offset
        });
      leaderboardData = result.data;
      error = result.error;
    }

    console.log('[Leaderboard API] RPC result:', {
      dataLength: leaderboardData?.length,
      error: error ? JSON.stringify(error) : null,
      firstEntry: leaderboardData?.[0]
    });

    if (error) {
      console.error('[Leaderboard API] Leaderboard fetch error:', error);
      return createErrorResponse(`Failed to fetch leaderboard: ${error.message || JSON.stringify(error)}`, 500);
    }

    console.log('[Leaderboard API] Raw data before mapping:', JSON.stringify(leaderboardData, null, 2));

    const leaderboard = (leaderboardData || []).map((player: any) => ({
      rank: Number(player.rank),
      user_id: player.user_id,
      username: player.username,
      avatar_url: player.avatar_url,
      score: Number(player.leaderboard_score),
      win_rate: Number(player.win_rate),
    }));

    console.log('[Leaderboard API] Mapped leaderboard:', JSON.stringify(leaderboard.slice(0, 3), null, 2));

    console.log('[Leaderboard API] Processed leaderboard entries:', leaderboard.length);

    let total = leaderboard.length;

    if (!friendsOnly) {
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      console.log('[Leaderboard API] Total count:', count, 'Error:', countError);
      total = count || leaderboard.length;
    } else {
      console.log('[Leaderboard API] Friends mode - total equals leaderboard length');
    }

    const response = {
      leaderboard,
      total,
      offset,
      limit,
    };

    console.log('[Leaderboard API] Sending response:', {
      leaderboardLength: response.leaderboard.length,
      total: response.total
    });

    return createSuccessResponse(response);

  } catch (error: any) {
    console.error('[Leaderboard API] Caught error:', error);
    console.error('[Leaderboard API] Error stack:', error.stack);
    return createErrorResponse(`Internal server error: ${error.message}`, 500);
  }
}
