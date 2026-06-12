import { Match, Team } from './utils';
import { getUtcDate } from './utils';

// Overlay live data from football-data.org (v4) on top of our base fixture.
// Free tier covers the FIFA World Cup (competition 2000) with score, status
// and live minute, refreshed about once per minute — far fresher than the
// fallback provider. Requires FOOTBALL_DATA_TOKEN; without it this module
// is skipped entirely.

const FD_MATCHES_URL = 'https://api.football-data.org/v4/competitions/2000/matches';
const KICKOFF_TOLERANCE_MS = 30 * 60 * 1000;
// Free tier allows 10 req/min; never attempt more than once every 30 s
const MIN_ATTEMPT_INTERVAL_MS = 30 * 1000;
let lastAttempt = 0;

// Diagnostics surfaced via /api/matches so provider health is visible
// without access to server logs
export interface ProviderStatus {
  tokenConfigured: boolean;
  lastResult: 'never' | 'ok' | 'http-error' | 'fetch-failed' | 'bad-shape' | 'throttled';
  httpStatus?: number;
  applied?: number;
  at?: string;
}

let providerStatus: ProviderStatus = {
  tokenConfigured: false,
  lastResult: 'never'
};

export function getProviderStatus(): ProviderStatus {
  return providerStatus;
}

interface FdTeam {
  id?: number;
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
}

interface FdMatch {
  utcDate?: string;
  status?: string;
  minute?: number | string | null;
  homeTeam?: FdTeam;
  awayTeam?: FdTeam;
  score?: {
    duration?: string;
    fullTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
}

// football-data names that differ from our dataset's name_en
const FD_NAME_ALIASES: Record<string, string> = {
  'czechia': 'czech republic',
  'korea republic': 'south korea',
  'cote divoire': 'ivory coast',
  'cabo verde': 'cape verde',
  'dr congo': 'democratic republic of the congo',
  'congo dr': 'democratic republic of the congo',
  'usa': 'united states',
  'ir iran': 'iran',
  'turkiye': 'turkey'
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Resolve a football-data team to our internal team id ('' if unknown)
function resolveTeamId(fdTeam: FdTeam | undefined, teams: Team[]): string {
  if (!fdTeam) return '';
  const tla = (fdTeam.tla || '').toUpperCase();
  if (tla) {
    const byCode = teams.find(t => t.fifa_code.toUpperCase() === tla);
    if (byCode) return byCode.id;
  }
  for (const raw of [fdTeam.name, fdTeam.shortName]) {
    if (!raw) continue;
    const norm = FD_NAME_ALIASES[normalizeName(raw)] || normalizeName(raw);
    const byName = teams.find(t => normalizeName(t.name_en) === norm);
    if (byName) return byName.id;
  }
  return '';
}

// Map football-data status/duration to our time_elapsed vocabulary
function mapStatus(fd: FdMatch): { time_elapsed: string; finished: string } | null {
  switch (fd.status) {
    case 'IN_PLAY': {
      if (fd.score?.duration === 'PENALTY_SHOOTOUT') return { time_elapsed: 'penalties', finished: 'FALSE' };
      if (fd.score?.duration === 'EXTRA_TIME') return { time_elapsed: 'extratime', finished: 'FALSE' };
      const minute = fd.minute != null ? String(fd.minute) : '';
      return { time_elapsed: /^\d+$/.test(minute) ? minute : 'live', finished: 'FALSE' };
    }
    case 'PAUSED':
      return { time_elapsed: 'halftime', finished: 'FALSE' };
    case 'FINISHED':
      return { time_elapsed: 'finished', finished: 'TRUE' };
    default:
      return null; // SCHEDULED/TIMED/POSTPONED...: keep base data untouched
  }
}

export async function fetchFootballDataOverlay(baseMatches: Match[], teams: Team[]): Promise<Match[] | null> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  providerStatus = { ...providerStatus, tokenConfigured: Boolean(token) };
  if (!token) return null;
  const nowMs = Date.now();
  if (nowMs - lastAttempt < MIN_ATTEMPT_INTERVAL_MS) {
    return null; // keep last providerStatus untouched
  }
  lastAttempt = nowMs;

  let fdMatches: FdMatch[];
  try {
    const res = await fetch(FD_MATCHES_URL, {
      headers: { 'X-Auth-Token': token },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) {
      console.warn(`football-data.org responded ${res.status}; keeping base data`);
      providerStatus = { tokenConfigured: true, lastResult: 'http-error', httpStatus: res.status, at: new Date().toISOString() };
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data?.matches)) {
      providerStatus = { tokenConfigured: true, lastResult: 'bad-shape', at: new Date().toISOString() };
      return null;
    }
    fdMatches = data.matches as FdMatch[];
  } catch (error) {
    console.warn('football-data.org fetch failed:', error);
    providerStatus = { tokenConfigured: true, lastResult: 'fetch-failed', at: new Date().toISOString() };
    return null;
  }

  const merged = baseMatches.map(m => ({ ...m }));
  let applied = 0;

  for (const fd of fdMatches) {
    if (!fd.utcDate) continue;
    const fdKickoff = Date.parse(fd.utcDate);
    if (!Number.isFinite(fdKickoff)) continue;

    const fdHomeId = resolveTeamId(fd.homeTeam, teams);
    const fdAwayId = resolveTeamId(fd.awayTeam, teams);

    // Candidates share the kickoff window; disambiguate by team pair when
    // possible, otherwise only accept a unique time match (knockout TBDs)
    const candidates = merged.filter(m =>
      Math.abs(getUtcDate(m.local_date, m.stadium_id).getTime() - fdKickoff) <= KICKOFF_TOLERANCE_MS
    );
    if (candidates.length === 0) continue;

    let target = fdHomeId && fdAwayId
      ? candidates.find(m =>
          (m.home_team_id === fdHomeId && m.away_team_id === fdAwayId) ||
          (m.home_team_id === fdAwayId && m.away_team_id === fdHomeId)
        )
      : undefined;

    if (!target && candidates.length === 1) {
      const only = candidates[0];
      // Trust the unique time slot only if base teams are undetermined or agree
      const baseUndetermined = only.home_team_id === '0' || only.away_team_id === '0';
      const agrees = fdHomeId && fdAwayId &&
        [only.home_team_id, only.away_team_id].every(id => id === fdHomeId || id === fdAwayId);
      if (baseUndetermined || agrees || (!fdHomeId && !fdAwayId)) target = only;
    }
    if (!target) continue;

    // Fill knockout brackets as soon as football-data knows the teams
    const swapped = target.home_team_id !== '0' && fdHomeId && target.home_team_id === fdAwayId;
    if (target.home_team_id === '0' && fdHomeId) target.home_team_id = fdHomeId;
    if (target.away_team_id === '0' && fdAwayId) target.away_team_id = fdAwayId;

    const status = mapStatus(fd);
    if (status) {
      target.time_elapsed = status.time_elapsed;
      target.finished = status.finished;

      const home = fd.score?.fullTime?.home;
      const away = fd.score?.fullTime?.away;
      if (typeof home === 'number' && typeof away === 'number') {
        // Respect our card's home/away orientation if it differs from FD's
        target.home_score = String(swapped ? away : home);
        target.away_score = String(swapped ? home : away);
      }
      applied++;
    }
  }

  console.log(`football-data.org overlay applied to ${applied} matches`);
  providerStatus = { tokenConfigured: true, lastResult: 'ok', applied, at: new Date().toISOString() };
  return merged;
}
