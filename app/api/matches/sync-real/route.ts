import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [SYNC-REAL] Admin triggered manual match synchronization...');

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized', 401);
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return createErrorResponse('Unauthorized', 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return createErrorResponse('Failed to fetch user profile', 500);
    }

    if (!profile || profile.role !== 'admin') {
      console.error('User is not admin. Profile:', profile);
      return createErrorResponse('Access denied: Admin role required', 403);
    }

    console.log('🔄 [SYNC-REAL] Calling sync-matches edge function...');

    const syncResponse = await fetch(
      `${supabaseUrl}/functions/v1/sync-matches`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({}),
      }
    );

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('❌ [SYNC-REAL] sync-matches call failed:', errorText);
      return createErrorResponse('Failed to sync matches', 500);
    }

    const syncData = await syncResponse.json();
    console.log('✅ [SYNC-REAL] sync-matches completed:', syncData);

    return createSuccessResponse({
      message: 'Match synchronization completed successfully',
      data: syncData,
    });

  } catch (error: any) {
    console.error('❌ [SYNC-REAL] Fatal error:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
}
