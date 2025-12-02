import { NextRequest } from 'next/server';
import { resolveAllFinishedMatches } from '@/lib/bet-resolution';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const result = await resolveAllFinishedMatches();

    return createSuccessResponse({
      resolved: result.resolved,
      failed: result.failed,
      message: result.message,
    });

  } catch (error: any) {
    console.error('Resolve bets error:', error);
    return createErrorResponse('Failed to resolve bets', 500);
  }
}
