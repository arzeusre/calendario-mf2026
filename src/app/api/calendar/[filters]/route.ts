import { NextRequest, NextResponse } from 'next/server';
import { getMatches, getTeams, getStadiums } from '@/lib/db';
import { generateCalendarIcs, CalendarOptions } from '@/lib/ical';

export const dynamic = 'force-dynamic';

// Path-encoded filters, e.g. /api/calendar/mundial2026_team-1_region-pe_alarmmin-30.ics
// Calendar clients (Google especially) mangle query strings in subscription
// URLs, so filters travel inside a single path segment with no & or ?.
function parseFilters(segment: string): CalendarOptions {
  const clean = decodeURIComponent(segment).replace(/\.ics$/i, '');
  const opts: CalendarOptions = {};

  for (const part of clean.split('_')) {
    const dash = part.indexOf('-');
    if (dash === -1) continue; // plain label like "mundial2026"
    const key = part.slice(0, dash);
    const value = part.slice(dash + 1);

    switch (key) {
      case 'team': opts.teamId = value; break;
      case 'group': opts.groupId = value; break;
      case 'stadium': opts.stadiumId = value; break;
      case 'region': opts.region = value; break;
      case 'alarm':
        if (value === 'off') opts.includeAlarm = false;
        break;
      case 'alarmmin': {
        const n = parseInt(value, 10);
        if (Number.isFinite(n) && n >= 0 && n <= 1440) opts.alarmMinutes = n;
        break;
      }
      case 'scores':
        if (value === 'off') opts.includeScores = false;
        break;
    }
  }

  return opts;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filters: string }> }
) {
  try {
    const { filters } = await params;
    const options = parseFilters(filters);

    const matches = await getMatches();
    const teams = await getTeams();
    const stadiums = await getStadiums();

    const icsContent = generateCalendarIcs(matches, teams, stadiums, options);

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
  } catch (error) {
    console.error('Error generating calendar (path filters):', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to generate calendar', details }, { status: 500 });
  }
}
