import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .maybeSingle();

    if (error) {
      return createErrorResponse('Failed to fetch profile', 500);
    }

    if (!profile) {
      return createErrorResponse('Profile not found', 404);
    }

    return createSuccessResponse({
      profile: {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        tokens: profile.tokens,
        diamonds: profile.diamonds,
        total_bets: profile.total_bets,
        won_bets: profile.won_bets,
        win_rate: profile.total_bets > 0
          ? Math.round((profile.won_bets / profile.total_bets) * 100)
          : 0,
        created_at: profile.created_at,
      },
    });

  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const body = await request.json();
    const { username, avatar_url } = body;

    const updates: any = {};

    if (username !== undefined) {
      if (username.length < 3) {
        return createErrorResponse('Username must be at least 3 characters', 400);
      }

      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user!.id)
        .maybeSingle();

      if (existingProfile) {
        return createErrorResponse('Username already taken', 400);
      }

      updates.username = username;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse('No valid fields to update', 400);
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user!.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return createErrorResponse('Failed to update profile', 500);
    }

    return createSuccessResponse({
      message: 'Profile updated successfully',
      profile: data,
    });

  } catch (error: any) {
    console.error('Profile update error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
