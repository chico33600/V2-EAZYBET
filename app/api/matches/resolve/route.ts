import { NextRequest, NextResponse } from 'next/server';
import { resolveMatchBets, simulateMatchResult } from '@/lib/bet-resolution';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, result, simulate } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    let resolutionResult;

    if (simulate) {
      resolutionResult = await simulateMatchResult(matchId);
    } else {
      if (!result || !['A', 'Draw', 'B'].includes(result)) {
        return NextResponse.json(
          { error: 'Valid result (A, Draw, or B) is required' },
          { status: 400 }
        );
      }
      resolutionResult = await resolveMatchBets(matchId, result);
    }

    return NextResponse.json(resolutionResult);
  } catch (error: any) {
    console.error('Error resolving match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve match' },
      { status: 500 }
    );
  }
}
