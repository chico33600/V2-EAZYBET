import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const league = searchParams.get('league');
    const mode = searchParams.get('mode');

    await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .lte('match_date', new Date().toISOString());

    let query = supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (league) {
      query = query.eq('league', league);
    }

    if (mode) {
      query = query.eq('match_mode', mode);
    }

    if (status === 'upcoming') {
      query = query.gt('match_date', new Date().toISOString());
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Fetch matches error:', error);
      return createErrorResponse('Failed to fetch matches', 500);
    }

    return createSuccessResponse({
      matches: matches || [],
    });

  } catch (error: any) {
    console.error('Fetch matches error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      team_a,
      team_b,
      league,
      odds_a,
      odds_draw,
      odds_b,
      match_date,
    } = body;

    // Validation
    if (!team_a || !team_b || !league || !odds_a || !odds_draw || !odds_b || !match_date) {
      return createErrorResponse('All match fields are required', 400);
    }

    if (odds_a <= 0 || odds_draw <= 0 || odds_b <= 0) {
      return createErrorResponse('Odds must be positive numbers', 400);
    }

    // Create match
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        team_a,
        team_b,
        league,
        odds_a,
        odds_draw,
        odds_b,
        match_date,
        status: 'upcoming',
      })
      .select()
      .single();

    if (error) {
      console.error('Create match error:', error);
      return createErrorResponse('Failed to create match', 500);
    }

    return createSuccessResponse({
      message: 'Match created successfully',
      match,
    }, 201);

  } catch (error: any) {
    console.error('Create match error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
