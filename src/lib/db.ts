import fs from 'fs';
import path from 'path';
import teamsData from '../data/teams.json';
import stadiumsData from '../data/stadiums.json';
import matchesData from '../data/matches.json';
import { Match, Team, Stadium } from './utils';
import { fetchFootballDataOverlay } from './footballData';

// Re-export type definitions for server usage
export type { Match, Team, Stadium };

// In-Memory store for matches (enables simulation/updates during runtime)
let inMemoryMatches: Match[] | null = null;
let lastLiveApiFetch = 0;
let lastLiveApiAttempt = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute: live scores must flow
const RETRY_AFTER_FAILURE_MS = 60 * 1000; // don't hammer a failing upstream

const liveFilePath = path.join(process.cwd(), 'src', 'data', 'matches-live.json');

// Real kickoff timestamps, captured server-side when a match first flips
// notstarted→live. Served to every client so the live minute is accurate
// even for visitors who open the page mid-match. Resets on a cold start
// (then clients fall back to the scheduled-kickoff estimate).
const kickoffByMatchId: Record<string, number> = {};

// Load matches from disk (live file if exists, else default matches.json)
function loadMatchesFromDisk(): Match[] {
  try {
    if (fs.existsSync(liveFilePath)) {
      const fileContent = fs.readFileSync(liveFilePath, 'utf-8');
      return JSON.parse(fileContent);
    }
  } catch (e) {
    console.error("Failed to read matches-live.json:", e);
  }
  return matchesData as Match[];
}

// Fetch matches from live API (callers decide when the cache window expired)
async function fetchMatchesFromLiveApi(): Promise<Match[] | null> {
  const now = Date.now();
  if (now - lastLiveApiAttempt < RETRY_AFTER_FAILURE_MS) {
    return null;
  }
  lastLiveApiAttempt = now;

  try {
    console.log("Fetching live matches from worldcup26.ir API...");
    const res = await fetch("https://worldcup26.ir/get/games", { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      // The API wraps the list in a "games" object ({ games: [...] }), but
      // accept a bare array too in case the upstream format changes back
      const games = Array.isArray(data) ? data : data?.games;
      if (Array.isArray(games) && games.length > 0 && isValidMatchList(games)) {
        lastLiveApiFetch = now;
        return games as Match[];
      }
      console.warn("Live API responded with an unexpected shape, falling back to local database");
    }
  } catch (error) {
    console.warn("Live API fetch failed, falling back to local database:", error);
  }
  return null;
}

// Sanity-check that upstream data has the fields the app depends on
function isValidMatchList(games: unknown[]): boolean {
  return games.every((g) => {
    const m = g as Partial<Match>;
    return typeof m.id === 'string' &&
      typeof m.local_date === 'string' &&
      typeof m.stadium_id === 'string' &&
      typeof m.finished === 'string' &&
      typeof m.time_elapsed === 'string';
  });
}

export async function getTeams(): Promise<Team[]> {
  return teamsData as Team[];
}

export async function getStadiums(): Promise<Stadium[]> {
  return stadiumsData as Stadium[];
}

export async function getMatches(forceRefresh = false): Promise<Match[]> {
  const cacheExpired = Date.now() - lastLiveApiFetch >= CACHE_DURATION_MS;
  if (!inMemoryMatches || forceRefresh || cacheExpired) {
    // Snapshot of previous statuses, to detect notstarted→live transitions
    const prevStatus = inMemoryMatches
      ? new Map(inMemoryMatches.map(m => [m.id, m.time_elapsed]))
      : null;

    let base = inMemoryMatches;
    const liveMatches = await fetchMatchesFromLiveApi();
    if (liveMatches) base = liveMatches;
    if (!base) {
      // Keep existing in-memory data (incl. simulations) when the live API
      // is unavailable; only fall back to disk on a cold start
      base = loadMatchesFromDisk();
    }

    // Preferred provider: football-data.org overlay (fresher scores and
    // real match minute) when FOOTBALL_DATA_TOKEN is configured
    const overlaid = await fetchFootballDataOverlay(base, teamsData as Team[]);
    if (overlaid) {
      base = overlaid;
      lastLiveApiFetch = Date.now();
    }

    // Record the real kickoff the first time a match goes live, then stamp
    // every match that has one so the client clock counts from actual start
    if (prevStatus) {
      for (const m of base) {
        const wasNotStarted = prevStatus.get(m.id) === 'notstarted';
        const isLiveNow = m.time_elapsed !== 'notstarted' && m.finished !== 'TRUE';
        if (wasNotStarted && isLiveNow && kickoffByMatchId[m.id] == null) {
          kickoffByMatchId[m.id] = Date.now();
        }
      }
    }
    for (const m of base) {
      if (kickoffByMatchId[m.id] != null) m.live_since = kickoffByMatchId[m.id];
    }

    inMemoryMatches = base;
  }
  return inMemoryMatches;
}

// Update a match (score, status, time, or teams)
export async function updateMatch(updatedMatch: Partial<Match> & { id: string }): Promise<Match> {
  const matches = await getMatches();
  const matchIndex = matches.findIndex(m => m.id === updatedMatch.id);
  
  if (matchIndex === -1) {
    throw new Error(`Match with id ${updatedMatch.id} not found`);
  }
  
  const newMatch = {
    ...matches[matchIndex],
    ...updatedMatch
  };
  
  matches[matchIndex] = newMatch;
  inMemoryMatches = [...matches];
  
  if (process.env.NODE_ENV === 'development') {
    try {
      const dir = path.dirname(liveFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(liveFilePath, JSON.stringify(inMemoryMatches, null, 2), 'utf-8');
      console.log(`Saved updated match ${updatedMatch.id} to matches-live.json`);
    } catch (e) {
      console.error("Failed to write updated matches to disk:", e);
    }
  }
  
  return newMatch;
}

// Reset matches to default configuration
export async function resetMatches(): Promise<void> {
  inMemoryMatches = [...(matchesData as Match[])];
  if (process.env.NODE_ENV === 'development') {
    try {
      if (fs.existsSync(liveFilePath)) {
        fs.unlinkSync(liveFilePath);
        console.log("Deleted matches-live.json to reset matches");
      }
    } catch (e) {
      console.error("Failed to delete matches-live.json:", e);
    }
  }
}
