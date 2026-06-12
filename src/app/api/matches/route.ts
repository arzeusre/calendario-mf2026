import { NextRequest, NextResponse } from 'next/server';
import { getMatches, getTeams, getStadiums, updateMatch, resetMatches } from '@/lib/db';
import { getProviderStatus } from '@/lib/footballData';

export const dynamic = 'force-dynamic';

// Write access (simulator) is restricted: open in development or when the
// operator explicitly enables the public simulator; otherwise requires the
// ADMIN_TOKEN secret via the x-admin-token header.
function isWriteAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.NEXT_PUBLIC_ENABLE_SIMULATOR === 'true') return true;
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken && request.headers.get('x-admin-token') === adminToken) return true;
  return false;
}

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
      stadiums,
      provider: getProviderStatus()
    });
  } catch (error) {
    console.error('Error fetching matches data:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch matches data', details }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isWriteAllowed(request)) {
    return NextResponse.json({ error: 'Simulator is disabled in production' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    const updatedMatch = await updateMatch({ id, ...updates });
    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (error) {
    console.error('Error updating match:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to update match', details }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isWriteAllowed(request)) {
    return NextResponse.json({ error: 'Simulator is disabled in production' }, { status: 403 });
  }
  try {
    await resetMatches();
    return NextResponse.json({ success: true, message: 'Matches reset to default configuration' });
  } catch (error) {
    console.error('Error resetting matches:', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to reset matches', details }, { status: 500 });
  }
}
