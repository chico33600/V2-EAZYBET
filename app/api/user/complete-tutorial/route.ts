import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
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
      return createErrorResponse('Unauthorized', 401);
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ has_seen_tutorial: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Tutorial update error:', updateError);
      return createErrorResponse('Failed to update tutorial status', 500);
    }

    return createSuccessResponse({
      message: 'Tutorial completed',
    });

  } catch (error: any) {
    console.error('Complete tutorial error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
