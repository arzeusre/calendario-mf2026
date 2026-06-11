import fs from 'fs';
import path from 'path';
import teamsData from '../data/teams.json';
import stadiumsData from '../data/stadiums.json';
import matchesData from '../data/matches.json';
import { Match, Team, Stadium } from './utils';

// Re-export type definitions for server usage
export type { Match, Team, Stadium };

// In-Memory store for matches (enables simulation/updates during runtime)
let inMemoryMatches: Match[] | null = null;
let lastLiveApiFetch = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const liveFilePath = path.join(process.cwd(), 'src', 'data', 'matches-live.json');

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

// Fetch matches from live API with 5-minute cache
async function fetchMatchesFromLiveApi(): Promise<Match[] | null> {
  const now = Date.now();
  if (now - lastLiveApiFetch < CACHE_DURATION_MS && inMemoryMatches) {
    return inMemoryMatches;
  }
  
  try {
    console.log("Fetching live matches from worldcup26.ir API...");
    const res = await fetch("https://worldcup26.ir/get/games", { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        lastLiveApiFetch = now;
        return data as Match[];
      }
    }
  } catch (error) {
    console.warn("Live API fetch failed, falling back to local database:", error);
  }
  return null;
}

export async function getTeams(): Promise<Team[]> {
  return teamsData as Team[];
}

export async function getStadiums(): Promise<Stadium[]> {
  return stadiumsData as Stadium[];
}

export async function getMatches(forceRefresh = false): Promise<Match[]> {
  if (!inMemoryMatches || forceRefresh) {
    const liveMatches = await fetchMatchesFromLiveApi();
    if (liveMatches) {
      inMemoryMatches = liveMatches;
    } else {
      inMemoryMatches = loadMatchesFromDisk();
    }
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
