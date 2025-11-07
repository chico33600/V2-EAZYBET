import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const friendsOnly = searchParams.get('friendsOnly') === 'true';

    if (userId && !friendsOnly) {
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
        } : null,
      });
    }

    let leaderboardData, error;

    if (friendsOnly && userId) {
      const result = await supabase
        .rpc('get_friends_leaderboard', {
          user_id_input: userId,
          limit_input: limit,
          offset_input: offset
        });
      leaderboardData = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .rpc('get_leaderboard', {
          limit_input: limit,
          offset_input: offset
        });
      leaderboardData = result.data;
      error = result.error;
    }

    console.log('RPC get_leaderboard result:', { data: leaderboardData, error });

    if (error) {
      console.error('Leaderboard fetch error:', error);
      return createErrorResponse('Failed to fetch leaderboard', 500);
    }

    const leaderboard = (leaderboardData || []).map((player: any) => ({
      rank: Number(player.rank),
      user_id: player.user_id,
      username: player.username,
      avatar_url: player.avatar_url,
      score: Number(player.leaderboard_score),
    }));

    console.log('Processed leaderboard:', leaderboard);

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    return createSuccessResponse({
      leaderboard,
      total: count || leaderboard.length,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('Leaderboard error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
