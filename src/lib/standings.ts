import { Match, Team, TEAM_NAMES_ES } from './utils';

export interface TeamStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

// Compute live standings for a group from finished matches
export function calculateGroupStandings(groupLetter: string, teams: Team[], matches: Match[]): TeamStanding[] {
  const groupTeams = teams.filter(t => t.groups === groupLetter);
  const standingsMap = new Map<string, TeamStanding>(
    groupTeams.map(t => [t.id, {
      team: t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    }])
  );

  const groupMatches = matches.filter(m => m.type === 'group' && m.group === groupLetter);

  for (const match of groupMatches) {
    if (match.finished !== 'TRUE') continue;

    const homeStanding = standingsMap.get(match.home_team_id);
    const awayStanding = standingsMap.get(match.away_team_id);

    if (!homeStanding || !awayStanding) continue;

    const homeScore = parseInt(match.home_score, 10);
    const awayScore = parseInt(match.away_score, 10);

    homeStanding.played += 1;
    awayStanding.played += 1;

    homeStanding.gf += homeScore;
    homeStanding.ga += awayScore;
    awayStanding.gf += awayScore;
    awayStanding.ga += homeScore;

    if (homeScore > awayScore) {
      homeStanding.won += 1;
      homeStanding.points += 3;
      awayStanding.lost += 1;
    } else if (awayScore > homeScore) {
      awayStanding.won += 1;
      awayStanding.points += 3;
      homeStanding.lost += 1;
    } else {
      homeStanding.drawn += 1;
      homeStanding.points += 1;
      awayStanding.drawn += 1;
      awayStanding.points += 1;
    }
  }

  for (const standing of standingsMap.values()) {
    standing.gd = standing.gf - standing.ga;
  }

  return Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const aName = TEAM_NAMES_ES[a.team.name_en] || a.team.name_en;
    const bName = TEAM_NAMES_ES[b.team.name_en] || b.team.name_en;
    return aName.localeCompare(bName);
  });
}
