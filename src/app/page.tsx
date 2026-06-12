import { headers } from 'next/headers';
import { getMatches, getTeams, getStadiums } from '@/lib/db';
import Dashboard from '@/components/Dashboard';

// Render at request time so the page always reflects the latest scores
export const dynamic = 'force-dynamic';

// Validate an IANA timezone before letting Intl consume it
function safeTimeZone(tz: string | null): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export default async function Home() {
  const [matches, teams, stadiums, requestHeaders] = await Promise.all([
    getMatches(),
    getTeams(),
    getStadiums(),
    headers()
  ]);

  // Vercel resolves the visitor's timezone from their IP: the very first
  // server-rendered HTML already shows local times instead of UTC
  const initialTimeZone = safeTimeZone(requestHeaders.get('x-vercel-ip-timezone'));

  const simulatorEnabled =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_SIMULATOR === 'true';

  return (
    <Dashboard
      initialMatches={matches}
      teams={teams}
      stadiums={stadiums}
      initialTimeZone={initialTimeZone}
      simulatorEnabled={simulatorEnabled}
    />
  );
}
