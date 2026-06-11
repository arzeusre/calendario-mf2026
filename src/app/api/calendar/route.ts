import { NextRequest, NextResponse } from 'next/server';
import { getMatches, getTeams, getStadiums } from '@/lib/db';
import { generateCalendarIcs } from '@/lib/ical';

// Force dynamic execution for every request to avoid build-time static generation of the API
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  
  const teamId = searchParams.get('team') || undefined;
  const groupId = searchParams.get('group') || undefined;
  const stadiumId = searchParams.get('stadium') || undefined;
  const includeAlarm = searchParams.get('alarm') !== 'false';
  const alarmMinutes = parseInt(searchParams.get('alarmMinutes') || '15', 10);
  const region = searchParams.get('region') || 'general';
  const includeScores = searchParams.get('scores') !== 'false';
  
  try {
    // Force a fresh fetch if the query parameter is passed (for manual syncing)
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    const matches = await getMatches(forceRefresh);
    const teams = await getTeams();
    const stadiums = await getStadiums();
    
    const icsContent = generateCalendarIcs(matches, teams, stadiums, {
      teamId,
      groupId,
      stadiumId,
      includeAlarm,
      alarmMinutes,
      region,
      includeScores
    });
    
    // Set headers to serve as iCalendar file subscription
    // 'no-store, no-cache' is crucial so calendar clients fetch the live feed on each check
    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="mundial2026.ics"',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error generating calendar API:', error);
    return NextResponse.json({ error: 'Failed to generate calendar', details: error.message }, { status: 500 });
  }
}
