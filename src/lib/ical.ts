import { Match, Team, Stadium, TEAM_NAMES_ES, CITY_NAMES_ES, getFlagEmoji, getUtcDate, getPhaseName, getElapsedLabel, translateTeamLabel, STADIUM_OFFSETS } from './utils';

// Format Date object to RFC 5545 iCalendar UTC string format: YYYYMMDDTHHMMSSZ
function formatIcalDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// RFC 5545 §3.1 line folding: content lines should not exceed 75 octets;
// longer lines continue on the next line prefixed with a space.
// Iterates by code point so multi-byte chars (emojis) are never split.
const utf8 = new TextEncoder();

function foldLine(line: string): string {
  if (utf8.encode(line).length <= 75) return line;

  const folded: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of line) {
    const chBytes = utf8.encode(ch).length;
    if (currentBytes + chBytes > 75) {
      folded.push(current);
      current = ' ' + ch;
      currentBytes = 1 + chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  folded.push(current);
  return folded.join('\r\n');
}

// Escape special characters in iCalendar text fields
function escapeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// TV Channels recommendation based on region code
const TV_CHANNELS: Record<string, string> = {
  "mx": "🇲🇽 México: TUDN, TV Azteca, ViX, Sky Sports",
  "ar": "🇦🇷 Argentina: TyC Sports, Telefe, TV Pública, DSports",
  "br": "🇧🇷 Brasil: TV Globo, CazéTV, SporTV",
  "co": "🇨🇴 Colombia: Caracol TV, RCN Televisión, DSports / DGO",
  "cl": "🇨🇱 Chile: Chilevisión, Canal 13, DSports / DGO",
  "pe": "🇵🇪 Perú: América TV, DSports / DGO",
  "py": "🇵🇾 Paraguay: Trece, Unicanal, GEN, DSports / DGO",
  "ec": "🇪🇨 Ecuador: Teleamazonas, El Canal del Fútbol (ECDF), DSports / DGO",
  "bo": "🇧🇴 Bolivia: Unitel, Red Uno, Tigo Sports, DSports / DGO",
  "uy": "🇺🇾 Uruguay: Antel TV, DSports / DGO",
  "ve": "🇻🇪 Venezuela: DSports / DGO, Inter",
  "es": "🇪🇸 España: RTVE (La 1), Teledeporte, RTVE Play",
  "us": "🇺🇸 USA: FOX Sports, Telemundo, Peacock, FuboTV",
  "general": "📺 Transmisión: Consulta la programación de TV local o FIFA+"
};

export interface CalendarOptions {
  teamId?: string;       // Filter by specific team ID
  groupId?: string;      // Filter by group (e.g. "A", "B", "R16", "QF")
  stadiumId?: string;    // Filter by stadium ID
  includeAlarm?: boolean;// Include pre-game notification
  alarmMinutes?: number; // Minutes before match for alarm (default: 15)
  region?: string;       // Country code for TV guide (e.g. "mx", "ar", "es")
  includeScores?: boolean; // Include scores in event titles
}

export function generateCalendarIcs(
  matches: Match[],
  teams: Team[],
  stadiums: Stadium[],
  options: CalendarOptions = {}
): string {
  const teamMap = new Map<string, Team>(teams.map(t => [t.id, t]));
  const stadiumMap = new Map<string, Stadium>(stadiums.map(s => [s.id, s]));

  const includeAlarm = options.includeAlarm ?? true;
  const alarmMinutes = options.alarmMinutes ?? 15;
  const region = (options.region || 'general').toLowerCase();
  const includeScores = options.includeScores ?? true;

  // One generation timestamp shared by every event in the feed
  const stampStr = formatIcalDate(new Date());

  // Filter matches
  let filteredMatches = matches;

  if (options.teamId) {
    filteredMatches = filteredMatches.filter(m => 
      m.home_team_id === options.teamId || m.away_team_id === options.teamId
    );
  }

  if (options.groupId) {
    filteredMatches = filteredMatches.filter(m => 
      m.group.toUpperCase() === options.groupId?.toUpperCase()
    );
  }

  if (options.stadiumId) {
    filteredMatches = filteredMatches.filter(m => m.stadium_id === options.stadiumId);
  }

  // Build calendar header
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity//Calendario Mundial 2026//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText('🏆 Mundial de Fútbol 2026')}`,
    'X-WR-TIMEZONE:UTC',
    `X-WR-CALDESC:${escapeText('Calendario actualizable con partidos, horarios locales y resultados del Mundial de Fútbol Canadá/USA/México 2026.')}`,
    // Suggested refresh cadence for calendar clients (Outlook/Apple honor these)
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H'
  ];

  // Process each match
  for (const match of filteredMatches) {
    const homeTeam = teamMap.get(match.home_team_id);
    const awayTeam = teamMap.get(match.away_team_id);
    const stadium = stadiumMap.get(match.stadium_id);

    const isGroup = match.type === 'group';
    
    // Resolve Team Names & Flags in Spanish
    let homeName = homeTeam ? (TEAM_NAMES_ES[homeTeam.name_en] || homeTeam.name_en) : '';
    let awayName = awayTeam ? (TEAM_NAMES_ES[awayTeam.name_en] || awayTeam.name_en) : '';
    let homeFlag = homeTeam ? getFlagEmoji(homeTeam.iso2) : '';
    let awayFlag = awayTeam ? getFlagEmoji(awayTeam.iso2) : '';

    // If teams are not determined yet (knockout phase placeholders)
    if (match.home_team_id === '0' || !homeTeam) {
      homeName = translateTeamLabel(match.home_team_label);
      homeFlag = '⚔️';
    }

    if (match.away_team_id === '0' || !awayTeam) {
      awayName = translateTeamLabel(match.away_team_label);
      awayFlag = '⚔️';
    }

    // Stage / Phase label in Spanish ("Grupo A", "Octavos de Final", ...)
    const phaseName = getPhaseName(match);

    // Format match title (Summary) based on status (live, finished, scheduled)
    let summary = '';
    const isFinished = match.finished === 'TRUE';
    const isLive = match.time_elapsed !== 'notstarted' && !isFinished;

    if (isFinished && includeScores) {
      summary = `✅ [FIN] ${homeFlag} ${homeName} ${match.home_score} - ${match.away_score} ${awayName} ${awayFlag}`;
    } else if (isLive && includeScores) {
      const elapsed = getElapsedLabel(match.time_elapsed);
      const liveLabel = elapsed ? `EN VIVO ${elapsed}` : 'EN VIVO';
      summary = `🔴 [${liveLabel}] ${homeFlag} ${homeName} ${match.home_score} - ${match.away_score} ${awayName} ${awayFlag}`;
    } else {
      summary = `🏆 [${phaseName}] ${homeFlag} ${homeName} vs. ${awayName} ${awayFlag}`;
    }

    // Build event description
    const stadiumName = stadium ? stadium.name_en : 'Estadio por definir';
    const rawCityName = stadium ? stadium.city_en : '';
    const cityName = CITY_NAMES_ES[rawCityName] || rawCityName || 'Ciudad por definir';
    const countryName = stadium ? (stadium.country_en === 'United States' ? 'Estados Unidos' : stadium.country_en) : '';
    
    const locationStr = stadium ? `${stadiumName}, ${cityName}, ${countryName}` : 'Sede por definir';

    // Calculate dates
    const startDate = getUtcDate(match.local_date, match.stadium_id);
    // Standard duration of a football match is 2 hours (120 minutes) including halftime/extra time in calendar
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    // Format dates for ics
    const startStr = formatIcalDate(startDate);
    const endStr = formatIcalDate(endDate);

    // TV channel text based on the selected region
    const tvText = TV_CHANNELS[region] || TV_CHANNELS['general'];

    // Construct description lines
    const descriptionLines = [
      `⚽ Encuentro: ${homeFlag} ${homeName} vs. ${awayName} ${awayFlag}`,
      `📌 Fase: ${isGroup ? `Fase de Grupos (Grupo ${match.group})` : phaseName}`,
      `🏟️ Estadio: ${stadiumName}`,
      `📍 Sede: ${cityName}, ${countryName}`,
      `🕒 Horario: Local del estadio (${match.local_date} - UTC${STADIUM_OFFSETS[match.stadium_id] >= 0 ? '+' : ''}${STADIUM_OFFSETS[match.stadium_id]})`
    ];

    if (isFinished) {
      descriptionLines.push(`📊 Resultado Final: ${homeName} ${match.home_score} - ${match.away_score} ${awayName}`);
      if (match.home_scorers !== 'null' && match.home_scorers) {
        descriptionLines.push(`⚽ Goles ${homeName}: ${match.home_scorers}`);
      }
      if (match.away_scorers !== 'null' && match.away_scorers) {
        descriptionLines.push(`⚽ Goles ${awayName}: ${match.away_scorers}`);
      }
    } else if (isLive) {
      descriptionLines.push(`🔴 Marcador en Vivo: ${homeName} ${match.home_score} - ${match.away_score} ${awayName}`);
    }

    descriptionLines.push(`\n${tvText}`);
    descriptionLines.push(`\n🔄 Calendario Auto-Actualizable. Si cambian los clasificados o el horario, se actualizará automáticamente en tu aplicación.`);

    const description = descriptionLines.join('\n');

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:match-${match.id}@mundial2026.com`);
    ics.push(`DTSTAMP:${stampStr}`);
    ics.push(`DTSTART:${startStr}`);
    ics.push(`DTEND:${endStr}`);
    ics.push(`SUMMARY:${escapeText(summary)}`);
    ics.push(`DESCRIPTION:${escapeText(description)}`);
    ics.push(`LOCATION:${escapeText(locationStr)}`);
    ics.push('STATUS:CONFIRMED');

    // Add alarm (pre-game alert)
    if (includeAlarm) {
      ics.push('BEGIN:VALARM');
      ics.push(`TRIGGER:-PT${alarmMinutes}M`);
      ics.push('ACTION:DISPLAY');
      ics.push(`DESCRIPTION:¡El partido ${escapeText(homeName)} vs ${escapeText(awayName)} está por comenzar!`);
      ics.push('END:VALARM');
    }

    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');

  // Fold long lines (RFC 5545 §3.1) and terminate the file with CRLF
  return ics.map(foldLine).join('\r\n') + '\r\n';
}
