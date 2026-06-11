import { getMatches, getTeams, getStadiums } from '@/lib/db';
import Dashboard from '@/components/Dashboard';

// Render at request time so the page always reflects the latest scores
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [matches, teams, stadiums] = await Promise.all([
    getMatches(),
    getTeams(),
    getStadiums()
  ]);

  const simulatorEnabled =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ENABLE_SIMULATOR === 'true';

  return (
    <Dashboard
      initialMatches={matches}
      teams={teams}
      stadiums={stadiums}
      simulatorEnabled={simulatorEnabled}
    />
  );
}
