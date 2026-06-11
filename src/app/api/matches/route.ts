import { NextRequest, NextResponse } from 'next/server';
import { getMatches, getTeams, getStadiums, updateMatch, resetMatches } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const forceRefresh = searchParams.get('refresh') === 'true';

    const matches = await getMatches(forceRefresh);
    const teams = await getTeams();
    const stadiums = await getStadiums();

    return NextResponse.json({
      matches,
      teams,
      stadiums
    });
  } catch (error: any) {
    console.error('Error fetching matches data:', error);
    return NextResponse.json({ error: 'Failed to fetch matches data', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    const updatedMatch = await updateMatch({ id, ...updates });
    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error: any) {
    console.error('Error updating match:', error);
    return NextResponse.json({ error: 'Failed to update match', details: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await resetMatches();
    return NextResponse.json({ success: true, message: 'Matches reset to default configuration' });
  } catch (error: any) {
    console.error('Error resetting matches:', error);
    return NextResponse.json({ error: 'Failed to reset matches', details: error.message }, { status: 500 });
  }
}
