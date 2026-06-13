export interface Team {
  id: string;
  name_en: string;
  name_fa: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
}

export interface Stadium {
  id: string;
  name_en: string;
  name_fa: string;
  fifa_name: string;
  city_en: string;
  city_fa: string;
  country_en: string;
  country_fa: string;
  capacity: number;
  region: string;
}

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  home_scorers: string;
  away_scorers: string;
  group: string;
  matchday: string;
  local_date: string; // MM/DD/YYYY HH:mm
  stadium_id: string;
  finished: string; // "TRUE" or "FALSE"
  time_elapsed: string; // "notstarted", "finished", or minutes
  type: string; // "group", "r16", "qf", "sf", "third", "final"
  home_team_label?: string; // e.g. "Winner Match 81"
  away_team_label?: string; // e.g. "Winner Match 82"
  live_since?: number; // epoch ms when the match was first observed live (real kickoff)
}

// Spanish translation dictionary for teams
export const TEAM_NAMES_ES: Record<string, string> = {
  "Mexico": "México",
  "South Africa": "Sudáfrica",
  "South Korea": "Corea del Sur",
  "Czech Republic": "República Checa",
  "Canada": "Canadá",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  "Qatar": "Catar",
  "Switzerland": "Suiza",
  "Brazil": "Brasil",
  "Morocco": "Marruecos",
  "Haiti": "Haití",
  "Scotland": "Escocia",
  "United States": "Estados Unidos",
  "Paraguay": "Paraguay",
  "Australia": "Australia",
  "Turkey": "Turquía",
  "Germany": "Alemania",
  "Curaçao": "Curazao",
  "Ivory Coast": "Costa de Marfil",
  "Ecuador": "Ecuador",
  "Netherlands": "Países Bajos",
  "Japan": "Japón",
  "Sweden": "Suecia",
  "Tunisia": "Túnez",
  "Belgium": "Bélgica",
  "Egypt": "Egipto",
  "Iran": "Irán",
  "New Zealand": "Nueva Zelanda",
  "Spain": "España",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita",
  "Uruguay": "Uruguay",
  "France": "Francia",
  "Senegal": "Senegal",
  "Iraq": "Irak",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argelia",
  "Austria": "Austria",
  "Jordan": "Jordania",
  "Portugal": "Portugal",
  "Democratic Republic of the Congo": "R. D. del Congo",
  "Uzbekistan": "Uzbekistán",
  "Colombia": "Colombia",
  "England": "Inglaterra",
  "Croatia": "Croacia",
  "Ghana": "Ghana",
  "Panama": "Panamá",
  "TBD": "Por definir"
};

// Spanish translation for cities
export const CITY_NAMES_ES: Record<string, string> = {
  "Mexico City": "Ciudad de México",
  "Guadalajara (Zapopan)": "Guadalajara",
  "Monterrey (Guadalupe)": "Monterrey",
  "Dallas (Arlington, Texas)": "Dallas",
  "Houston": "Houston",
  "Kansas City": "Kansas City",
  "Atlanta": "Atlanta",
  "Miami (Miami Gardens)": "Miami",
  "Boston (Foxborough)": "Boston",
  "Philadelphia": "Filadelfia",
  "New York/New Jersey (East Rutherford)": "Nueva York/Nueva Jersey",
  "Toronto": "Toronto",
  "Vancouver": "Vancouver",
  "Seattle": "Seattle",
  "San Francisco Bay Area (Santa Clara)": "San Francisco",
  "Los Angeles (Inglewood)": "Los Ángeles"
};

// Spanish names for tournament phases (keyed by Match.type)
export const PHASE_NAMES_ES: Record<string, string> = {
  r32: "Dieciseisavos de Final",
  r16: "Octavos de Final",
  qf: "Cuartos de Final",
  sf: "Semifinales",
  third: "Tercer Puesto",
  final: "Gran Final"
};

export function getPhaseName(match: { type: string; group: string }): string {
  if (match.type === 'group') return `Grupo ${match.group}`;
  return PHASE_NAMES_ES[match.type] || match.group;
}

// Human label for the in-progress clock. The live API sends "live",
// "halftime" or the minute as a number string
export function getElapsedLabel(timeElapsed: string): string | null {
  if (timeElapsed === 'halftime' || timeElapsed === 'ht') return 'Descanso';
  if (timeElapsed === 'extratime' || timeElapsed === 'et' || timeElapsed === 'overtime') return 'Tiempo Extra';
  if (timeElapsed.startsWith('pen')) return 'Penales';
  if (/^\d+$/.test(timeElapsed)) return `${timeElapsed}′`;
  return null; // "live" or unknown markers: no extra detail beyond "En Vivo"
}

// Match minute for the live badge. Prefers what the provider reports
// (exact minute, halftime, extra time, penalties); only when it just says
// "live" we estimate from an anchor. The anchor is the REAL kickoff moment
// when we captured it (the notstarted→live transition); otherwise the
// scheduled kickoff. With a real anchor the minute is accurate to ~1 min,
// so we drop the "≈"; with the scheduled fallback we keep it.
export function getLiveMinuteEstimate(
  timeElapsed: string,
  anchorMs: number,
  nowMs: number,
  realAnchor = false
): string | null {
  const reported = getElapsedLabel(timeElapsed);
  if (reported) return reported;
  if (nowMs <= 0 || anchorMs <= 0) return null;

  const mins = Math.floor((nowMs - anchorMs) / 60000);
  const pfx = realAnchor ? '' : '≈';
  if (mins < 1) return `${pfx}1′`;
  if (mins <= 45) return `${pfx}${mins}′`;
  if (mins <= 60) return `${pfx}45+′`;                          // 1.ª parte + añadido / inicio del descanso
  if (mins <= 120) return `${pfx}${Math.min(90, mins - 15)}′`;  // 2.ª parte (descontado el descanso ~15')
  return `${pfx}90+′`;
}

// Translate knockout placeholder labels ("Winner Match 74", "Runner-up Group A",
// "3rd Group A/B/C/D/F", "Loser Match 101") to Spanish
export function translateTeamLabel(label?: string): string {
  if (!label) return 'Por definir';
  return label
    .replace(/^Winner Match\b/, 'Ganador Partido')
    .replace(/^Loser Match\b/, 'Perdedor Partido')
    .replace(/^Winner Group\b/, 'Ganador Grupo')
    .replace(/^Runner-up Group\b/, 'Segundo Grupo')
    .replace(/^3rd Group\b/, 'Mejor Tercero Grupos');
}

// Map ISO-2 or team code to Flag Emoji
export function getFlagEmoji(iso2: string): string {
  if (!iso2) return "🏳️";
  const code = iso2.toUpperCase();
  // England/Scotland/Wales use Unicode tag sequences that Windows renders
  // as a plain black flag; the Union Jack degrades gracefully everywhere
  if (code === "ENG" || code === "SCO" || code === "WAL") return "🇬🇧";
  if (code.length !== 2) return "🏳️";
  const codePoints = code
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Timezone offsets of the stadiums in June/July 2026
export const STADIUM_OFFSETS: Record<string, number> = {
  "1": -6,  // Mexico City (CST, no DST)
  "2": -6,  // Guadalajara (CST, no DST)
  "3": -6,  // Monterrey (CST, no DST)
  "4": -5,  // Dallas (CDT, US Central DST)
  "5": -5,  // Houston (CDT)
  "6": -5,  // Kansas City (CDT)
  "7": -4,  // Atlanta (EDT, US Eastern DST)
  "8": -4,  // Miami (EDT)
  "9": -4,  // Boston (EDT)
  "10": -4, // Philadelphia (EDT)
  "11": -4, // NY/NJ (EDT)
  "12": -4, // Toronto (EDT)
  "13": -7, // Vancouver (PDT, US Pacific DST)
  "14": -7, // Seattle (PDT)
  "15": -7, // San Francisco (PDT)
  "16": -7  // Los Angeles (PDT)
};

// Convert a local date string (MM/DD/YYYY HH:mm) in a stadium's timezone to a UTC Date
export function getUtcDate(localDateStr: string, stadiumId: string): Date {
  const [datePart, timePart] = localDateStr.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Construct Date as UTC literal
  const utcLiteral = Date.UTC(year, month - 1, day, hours, minutes);
  const offset = STADIUM_OFFSETS[stadiumId] ?? 0;
  
  // Local time = UTC + offset  =>  UTC = Local time - offset
  const utcTimeMs = utcLiteral - (offset * 60 * 60 * 1000);
  return new Date(utcTimeMs);
}
