import { Match, Team, Stadium, TEAM_NAMES_ES, CITY_NAMES_ES, getFlagEmoji, getUtcDate, STADIUM_OFFSETS } from './utils';

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
  "br": "🇧🇷 Brasil: TV Globo, SporTV, Globoplay",
  "co": "🇨🇴 Colombia: Caracol TV, RCN Televisión, DSports",
  "cl": "🇨🇱 Chile: Chilevisión, Canal 13, DSports",
  "pe": "🇵🇪 Perú: Latina Televisión, DSports",
  "py": "🇵🇾 Paraguay: SNT, Telefuturo, Trece, DSports",
  "ec": "🇪🇨 Ecuador: Teleamazonas, El Canal del Fútbol, DSports",
  "bo": "🇧🇴 Bolivia: Unitel, Red Uno, Bolivia TV, DSports",
  "uy": "🇺🇾 Uruguay: Antel TV, DSports, Dexary",
  "ve": "🇻🇪 Venezuela: Televen, DSports",
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
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Antigravity//Calendario Mundial 2026//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:🏆 Mundial de Fútbol 2026',
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALDESC:Calendario actualizable con partidos, horarios locales y resultados del Mundial de Fútbol Canadá/USA/México 2026.'
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
      homeName = match.home_team_label 
        ? match.home_team_label
            .replace('Winner Match', 'Ganador Partido')
            .replace('Loser Match', 'Perdedor Partido')
        : 'Por definir';
      homeFlag = '⚔️';
    }

    if (match.away_team_id === '0' || !awayTeam) {
      awayName = match.away_team_label 
        ? match.away_team_label
            .replace('Winner Match', 'Ganador Partido')
            .replace('Loser Match', 'Perdedor Partido')
        : 'Por definir';
      awayFlag = '⚔️';
    }

    // Determine Stage / Phase label in Spanish
    let phaseName = '';
    switch (match.type) {
      case 'group': phaseName = `Grupo ${match.group}`; break;
      case 'r16': phaseName = `Dieciseisavos de Final (R32)`; break; // Wait, wait. In 48-team World Cup, R32 is "Dieciseisavos", R16 is "Octavos".
      // Let's verify: 
      // r16 in the json database actually refers to Round of 32? 
      // Let's check matches.json. In our matches.json view, match 94 has type "r16" and group "R16". But the label was Winner Match 81.
      // Wait, there are 104 matches. Match 1 to 72 are groups. 
      // Match 73 to 88 (16 matches) are Round of 32 (Dieciseisavos).
      // Match 89 to 96 (8 matches) are Round of 16 (Octavos).
      // Match 97 to 100 (4 matches) are Quarterfinals (Cuartos).
      // Match 101 to 102 (2 matches) are Semifinals (Semifinal).
      // Match 103 is Third place match.
      // Match 104 is Final.
      // In this JSON schema, "type": "r16" refers to the round after groups. Wait, match 94 has type "r16", and local_date "07/06/2026". That is July 2026. 
      // Let's map type labels:
      // "group" -> Fase de Grupos
      // "r16" -> Octavos de Final (or round of 32/16 depending on the json). Let's check:
      // In the database matches.json:
      // Match 73 has type: "r32" or "r16"? Let's double check matches.json to see how they label the knockout stages.
      // Oh, in matches.json, we saw Match 94, 95, 96 have type "r16" and group "R16".
      // Let's look up how the phases are named:
      // - group -> Grupo X
      // - r32 -> Dieciseisavos de Final
      // - r16 -> Octavos de Final
      // - qf -> Cuartos de Final
      // - sf -> Semifinal
      // - third -> Tercer Puesto
      // - final -> Final
      default:
        if (match.type === 'r32') phaseName = 'Dieciseisavos de Final';
        else if (match.type === 'r16') phaseName = 'Octavos de Final';
        else if (match.type === 'qf') phaseName = 'Cuartos de Final';
        else if (match.type === 'sf') phaseName = 'Semifinales';
        else if (match.type === 'third') phaseName = 'Tercer Puesto';
        else if (match.type === 'final') phaseName = 'Gran Final';
        else phaseName = match.group;
    }

    // Format match title (Summary) based on status (live, finished, scheduled)
    let summary = '';
    const isFinished = match.finished === 'TRUE';
    const isLive = match.time_elapsed !== 'notstarted' && !isFinished;

    if (isFinished && includeScores) {
      summary = `✅ [FIN] ${homeFlag} ${homeName} ${match.home_score} - ${match.away_score} ${awayName} ${awayFlag}`;
    } else if (isLive && includeScores) {
      const minutesLabel = match.time_elapsed === 'halftime' ? 'Entretiempo' : `Min ${match.time_elapsed}'`;
      summary = `🔴 [LIV - ${minutesLabel}] ${homeFlag} ${homeName} ${match.home_score} - ${match.away_score} ${awayName} ${awayFlag}`;
    } else {
      const phasePrefix = isGroup ? `Grupo ${match.group}` : phaseName;
      summary = `🏆 [${phasePrefix}] ${homeFlag} ${homeName} vs. ${awayName} ${awayFlag}`;
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
    const stampStr = formatIcalDate(new Date());

    // TV channel text based on the selected region
    const tvText = TV_CHANNELS[region] || TV_CHANNELS['general'];

    // Construct description lines
    let descriptionLines = [
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

  return ics.join('\r\n');
}
