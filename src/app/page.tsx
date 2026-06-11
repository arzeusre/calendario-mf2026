"use client";

import { useState, useEffect } from 'react';
import { Match, Team, Stadium, TEAM_NAMES_ES, CITY_NAMES_ES, getFlagEmoji, getUtcDate } from '@/lib/utils';
import styles from './page.module.css';

// Hex colors for group border accents
const GROUP_COLORS: Record<string, string> = {
  "A": "#ef4444", // Red
  "B": "#3b82f6", // Blue
  "C": "#10b981", // Green
  "D": "#f59e0b", // Amber
  "E": "#8b5cf6", // Purple
  "F": "#ec4899", // Pink
  "G": "#06b6d4", // Cyan
  "H": "#10b981", // Emerald
  "I": "#6366f1", // Indigo
  "J": "#a855f7", // Violet
  "K": "#d946ef", // Fuchsia
  "L": "#eab308"  // Yellow
};

const TV_REGIONS = [
  { code: 'general', name: 'General (FIFA+ / TV Local)', flagUrl: null, emoji: '🌍' },
  { code: 'mx', name: 'México (TUDN, Azteca, ViX)', flagUrl: 'https://flagcdn.com/w40/mx.png', emoji: '🇲🇽' },
  { code: 'ar', name: 'Argentina (TyC, Telefe, DSports)', flagUrl: 'https://flagcdn.com/w40/ar.png', emoji: '🇦🇷' },
  { code: 'br', name: 'Brasil (TV Globo, SporTV, Globoplay)', flagUrl: 'https://flagcdn.com/w40/br.png', emoji: '🇧🇷' },
  { code: 'co', name: 'Colombia (Caracol, RCN, DSports)', flagUrl: 'https://flagcdn.com/w40/co.png', emoji: '🇨🇴' },
  { code: 'cl', name: 'Chile (CHV, Canal 13, DSports)', flagUrl: 'https://flagcdn.com/w40/cl.png', emoji: '🇨🇱' },
  { code: 'pe', name: 'Perú (Latina TV, DSports)', flagUrl: 'https://flagcdn.com/w40/pe.png', emoji: '🇵🇪' },
  { code: 'py', name: 'Paraguay (SNT, Telefuturo, Trece, DSports)', flagUrl: 'https://flagcdn.com/w40/py.png', emoji: '🇵🇾' },
  { code: 'ec', name: 'Ecuador (Teleamazonas, ECDF, DSports)', flagUrl: 'https://flagcdn.com/w40/ec.png', emoji: '🇪🇨' },
  { code: 'bo', name: 'Bolivia (Unitel, Red Uno, DSports)', flagUrl: 'https://flagcdn.com/w40/bo.png', emoji: '🇧🇴' },
  { code: 'uy', name: 'Uruguay (Antel TV, DSports)', flagUrl: 'https://flagcdn.com/w40/uy.png', emoji: '🇺🇾' },
  { code: 've', name: 'Venezuela (Televen, DSports)', flagUrl: 'https://flagcdn.com/w40/ve.png', emoji: '🇻🇪' },
  { code: 'es', name: 'España (RTVE, Teledeporte)', flagUrl: 'https://flagcdn.com/w40/es.png', emoji: '🇪🇸' },
  { code: 'us', name: 'EE. UU. (FOX, Telemundo, Peacock)', flagUrl: 'https://flagcdn.com/w40/us.png', emoji: '🇺🇸' }
];

interface TeamStanding {
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

export default function Home() {
  // Data State
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurator / Subscription Filters State
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStadium, setSelectedStadium] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('general');
  const [isTvDropdownOpen, setIsTvDropdownOpen] = useState(false);
  const activeTvOption = TV_REGIONS.find(r => r.code === selectedRegion) || TV_REGIONS[0];
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmMinutes, setAlarmMinutes] = useState(15);
  const [scoresEnabled, setScoresEnabled] = useState(true);

  // Theme State - Default is True (Light Theme)
  const [isLightTheme, setIsLightTheme] = useState(true);

  // Mobile Filters Accordion State
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Navigation / Tabs State
  // Reordered tabs: Todos, En Vivo, Próximos, Finalizados, Fase Final (Llaves) y Grupos
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'finished' | 'knockout' | 'groups'>('all');

  // Subscription URL Construction State
  const [origin, setOrigin] = useState('https://calendario-mundial2026.vercel.app'); // default fallback
  const [copySuccess, setCopySuccess] = useState(false);

  // Simulator Modal State
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [simHomeScore, setSimHomeScore] = useState('0');
  const [simAwayScore, setSimAwayScore] = useState('0');
  const [simHomeTeamId, setSimHomeTeamId] = useState('0');
  const [simAwayTeamId, setSimAwayTeamId] = useState('0');
  const [simFinished, setSimFinished] = useState(false);
  const [simTimeElapsed, setSimTimeElapsed] = useState('notstarted');

  // Group Standings Modal State
  const [selectedGroupModal, setSelectedGroupModal] = useState<string | null>(null);

  // Load origin and theme on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsLightTheme(false);
        document.body.classList.add('dark-theme');
        document.documentElement.classList.add('dark-theme');
      } else {
        setIsLightTheme(true);
        document.body.classList.remove('dark-theme');
        document.documentElement.classList.remove('dark-theme');
      }
    }
  }, []);

  // Close custom TV dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsTvDropdownOpen(false);
    };
    if (isTvDropdownOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, [isTvDropdownOpen]);

  // Toggle Theme
  const toggleTheme = () => {
    setIsLightTheme(prev => {
      const newVal = !prev; // if prev was true (light), newVal is false (dark)
      if (newVal) {
        document.body.classList.remove('dark-theme');
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.add('dark-theme');
        document.documentElement.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      }
      return newVal;
    });
  };

  // Fetch match data
  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const url = `/api/matches${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar la información del servidor');
      const data = await res.json();
      setMatches(data.matches);
      setTeams(data.teams);
      setStadiums(data.stadiums);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Construct Subscription URL
  const queryParams: string[] = [];
  if (selectedTeam) queryParams.push(`team=${selectedTeam}`);
  if (selectedGroup) queryParams.push(`group=${selectedGroup}`);
  if (selectedStadium) queryParams.push(`stadium=${selectedStadium}`);
  if (selectedRegion !== 'general') queryParams.push(`region=${selectedRegion}`);
  if (!alarmEnabled) queryParams.push(`alarm=false`);
  if (alarmEnabled && alarmMinutes !== 15) queryParams.push(`alarmMinutes=${alarmMinutes}`);
  if (!scoresEnabled) queryParams.push(`scores=false`);

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  const calendarHttpUrl = `${origin}/api/calendar${queryString}`;
  const calendarWebcalUrl = calendarHttpUrl.replace(/^https?:\/\//i, 'webcal://');

  // Copy to clipboard helper
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarWebcalUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error al copiar', err);
    }
  };

  // Google Calendar subscribe URL
  const getGoogleCalendarUrl = () => {
    const webcalUrl = calendarHttpUrl.replace(/^https?:\/\//i, 'webcal://');
    return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
  };

  // Reset all matches simulator
  const handleResetMatches = async () => {
    if (confirm('¿Estás seguro de que quieres restablecer todos los partidos al calendario inicial oficial?')) {
      try {
        setLoading(true);
        const res = await fetch('/api/matches', { method: 'DELETE' });
        if (res.ok) {
          await fetchData(true);
        } else {
          alert('Error al reiniciar los datos');
        }
      } catch (err) {
        console.error(err);
        alert('Error en el servidor');
      } finally {
        setLoading(false);
      }
    }
  };

  // Open Simulator Modal
  const openSimulator = (match: Match) => {
    setEditingMatch(match);
    setSimHomeScore(match.home_score);
    setSimAwayScore(match.away_score);
    setSimHomeTeamId(match.home_team_id);
    setSimAwayTeamId(match.away_team_id);
    setSimFinished(match.finished === 'TRUE');
    setSimTimeElapsed(match.time_elapsed);
  };

  // Save Simulated Match
  const saveSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    try {
      setLoading(true);
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMatch.id,
          home_score: simHomeScore,
          away_score: simAwayScore,
          home_team_id: simHomeTeamId,
          away_team_id: simAwayTeamId,
          finished: simFinished ? 'TRUE' : 'FALSE',
          time_elapsed: simTimeElapsed
        })
      });

      if (res.ok) {
        setEditingMatch(null);
        await fetchData();
      } else {
        alert('Error al guardar la simulación');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con la API');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Standings Calculation
  const calculateGroupStandings = (groupLetter: string): TeamStanding[] => {
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
  };

  // Filter matches based on configurations and active tab
  const filteredMatchesForDisplay = matches.filter(match => {
    // 1. Apply Active Navigation Tab Filter
    const isFinished = match.finished === 'TRUE';
    const isLive = match.time_elapsed !== 'notstarted' && !isFinished;
    const isUpcoming = match.time_elapsed === 'notstarted' && !isFinished;

    if (activeTab === 'live') {
      if (!isLive) return false;
    } else if (activeTab === 'upcoming') {
      if (!isUpcoming) return false;
    } else if (activeTab === 'finished') {
      if (!isFinished) return false;
    } else if (activeTab === 'knockout') {
      if (match.type === 'group') return false;
    }

    // 2. Apply config sidebar filters (Only for preview filtering)
    if (selectedTeam) {
      if (match.home_team_id !== selectedTeam && match.away_team_id !== selectedTeam) return false;
    }
    if (selectedGroup) {
      if (match.group.toUpperCase() !== selectedGroup.toUpperCase()) return false;
    }
    if (selectedStadium) {
      if (match.stadium_id !== selectedStadium) return false;
    }

    return true;
  });

  const teamMap = new Map<string, Team>(teams.map(t => [t.id, t]));
  const stadiumMap = new Map<string, Stadium>(stadiums.map(s => [s.id, s]));

  // Get stadium details text
  const getStadiumDetailsText = (stadiumId: string) => {
    const stadium = stadiumMap.get(stadiumId);
    if (!stadium) return 'Estadio Desconocido';
    const city = CITY_NAMES_ES[stadium.city_en] || stadium.city_en;
    const country = stadium.country_en === 'United States' ? 'EE. UU.' : stadium.country_en;
    return `${stadium.name_en} (${city}, ${country})`;
  };

  // Format date helper for view
  const formatMatchDate = (dateStr: string, stadiumId: string) => {
    try {
      const date = getUtcDate(dateStr, stadiumId);
      return date.toLocaleString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace('.', '');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <main className={`${styles.main} container`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.themeToggleContainer}>
          <button onClick={toggleTheme} className={styles.themeBtn} title="Cambiar Tema">
            {isLightTheme ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
          </button>
        </div>

        <h1 className={`${styles.title} gradient-text gold-glow`}>
          🏆 Calendario Mundial de Fútbol 2026
        </h1>
        <p className={styles.subtitle}>
          Suscríbete de manera automática a tu calendario personal. Los horarios se adaptan automáticamente a tu huso horario y los resultados y llaves se actualizan en tiempo real.
        </p>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>104</div>
            <div className={styles.statLabel}>Partidos</div>
          </div>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>48</div>
            <div className={styles.statLabel}>Países</div>
          </div>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>3</div>
            <div className={styles.statLabel}>Sedes</div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className={styles.dashboardLayout}>
        {/* Mobile Accordion Toggle Header for filters */}
        <button 
          className={styles.mobileFilterToggle} 
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
        >
          {isMobileFiltersOpen ? '▲ Ocultar Filtros de Suscripción' : '⚙️ Configurar Suscripción (Mostrar Filtros)'}
        </button>

        {/* Sidebar Configurator */}
        <section className={`${styles.sidebar} ${!isMobileFiltersOpen ? styles.mobileCollapsed : ''}`}>
          <div className={`${styles.configPanel} glass`}>
            <h2 className={styles.panelTitle}>
              ⚙️ Filtros de Suscripción
            </h2>

            {/* Team Filter */}
            <div className={styles.formGroup}>
              <label htmlFor="team-filter">Filtrar por Selección:</label>
              <select 
                id="team-filter" 
                className={styles.select}
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">✨ Todos los equipos</option>
                {teams
                  .sort((a, b) => (TEAM_NAMES_ES[a.name_en] || a.name_en).localeCompare(TEAM_NAMES_ES[b.name_en] || b.name_en))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      {TEAM_NAMES_ES[t.name_en] || t.name_en}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Group Filter */}
            <div className={styles.formGroup}>
              <label htmlFor="group-filter">Filtrar por Grupo:</label>
              <select 
                id="group-filter" 
                className={styles.select}
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="">✨ Todos los grupos</option>
                {Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)).map(g => (
                  <option key={g} value={g}>Grupo {g}</option>
                ))}
              </select>
            </div>

            {/* Stadium Filter */}
            <div className={styles.formGroup}>
              <label htmlFor="stadium-filter">Filtrar por Sede:</label>
              <select 
                id="stadium-filter" 
                className={styles.select}
                value={selectedStadium}
                onChange={(e) => setSelectedStadium(e.target.value)}
              >
                <option value="">✨ Todos los estadios</option>
                {stadiums.map(s => (
                  <option key={s.id} value={s.id}>
                    🏟️ {s.name_en} ({CITY_NAMES_ES[s.city_en] || s.city_en})
                  </option>
                ))}
              </select>
            </div>

            {/* TV Region Selector (Custom Dropdown with images to support Windows) */}
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>Guía de Canales de TV:</label>
              <div 
                className={styles.customSelect} 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTvDropdownOpen(!isTvDropdownOpen);
                }}
              >
                <div className={styles.customSelectTrigger}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeTvOption.flagUrl ? (
                      <img 
                        src={activeTvOption.flagUrl} 
                        alt={activeTvOption.name} 
                        className={styles.selectFlag} 
                      />
                    ) : (
                      <span style={{ fontSize: '1.1rem', lineHeight: '1' }}>{activeTvOption.emoji}</span>
                    )}
                    <span>{activeTvOption.name}</span>
                  </div>
                  <span className={styles.arrow} style={{ transform: isTvDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
                </div>
                {isTvDropdownOpen && (
                  <div className={styles.customSelectOptions}>
                    {TV_REGIONS.map(regionOpt => (
                      <div 
                        key={regionOpt.code} 
                        className={`${styles.customSelectOption} ${selectedRegion === regionOpt.code ? styles.customSelectOptionActive : ''}`}
                        onClick={() => {
                          setSelectedRegion(regionOpt.code);
                        }}
                      >
                        {regionOpt.flagUrl ? (
                          <img 
                            src={regionOpt.flagUrl} 
                            alt={regionOpt.name} 
                            className={styles.selectFlag} 
                          />
                        ) : (
                          <span style={{ fontSize: '1.1rem', lineHeight: '1' }}>{regionOpt.emoji}</span>
                        )}
                        <span>{regionOpt.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Toggle options */}
            <div style={{ marginTop: '1.5rem' }}>
              <div className={styles.checkboxGroup} onClick={() => setScoresEnabled(!scoresEnabled)}>
                <input 
                  type="checkbox" 
                  checked={scoresEnabled} 
                  onChange={() => {}}
                  style={{ pointerEvents: 'none' }}
                />
                <span className={styles.checkboxLabel}>Actualizar con marcadores en tiempo real</span>
              </div>

              <div className={styles.checkboxGroup} onClick={() => setAlarmEnabled(!alarmEnabled)}>
                <input 
                  type="checkbox" 
                  checked={alarmEnabled} 
                  onChange={() => {}}
                  style={{ pointerEvents: 'none' }}
                />
                <span className={styles.checkboxLabel}>Incluir alertas de recordatorio</span>
              </div>

              {alarmEnabled && (
                <div className={styles.sliderContainer}>
                  <div className={styles.sliderHeader}>
                    <span>Recordar antes del partido</span>
                    <span style={{ color: 'hsl(var(--accent))', fontWeight: 'bold' }}>{alarmMinutes} min</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5" 
                    className="range-slider"
                    value={alarmMinutes}
                    onChange={(e) => setAlarmMinutes(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Generated Subscription Details */}
            <div className={styles.urlBox}>
              <div className={styles.urlTitle}>🔗 Enlace de Suscripción</div>
              <div className={styles.urlText}>{calendarWebcalUrl}</div>
            </div>

            {/* Subscription Actions */}
            <div className={styles.actionsContainer}>
              <button onClick={handleCopyUrl} className={`${styles.btn} ${styles.btnPrimary}`}>
                {copySuccess ? '📋 ¡Copiado!' : '📎 Copiar URL Webcal'}
              </button>
              
              <a 
                href={calendarWebcalUrl} 
                className={`${styles.btn} ${styles.btnOutline}`}
                style={{ textAlign: 'center' }}
              >
                🍏 Suscribirse en Apple iCal
              </a>

              <a 
                href={getGoogleCalendarUrl()} 
                target="_blank" 
                rel="noreferrer" 
                className={`${styles.btn} ${styles.btnOutline}`}
                style={{ textAlign: 'center' }}
              >
                🤖 Añadir a Google Calendar
              </a>
              
              <a 
                href={calendarHttpUrl} 
                download="mundial2026.ics"
                className={`${styles.btn} ${styles.btnOutline}`}
                style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}
              >
                💾 Descargar archivo estático .ics
              </a>
            </div>
          </div>

          {/* Simulator Panel / Options Control */}
          <div className={`${styles.configPanel} glass`} style={{ borderStyle: 'dashed', borderColor: 'rgba(250, 204, 21, 0.2)' }}>
            <h3 className={styles.panelTitle} style={{ color: 'hsl(var(--accent))' }}>
              🛠️ Panel de Simulación
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Cambia marcadores, clasificados de llaves o estados de partidos en local y refresca tu app de calendario para verificar la sincronización instantánea.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              <button 
                onClick={() => fetchData(true)} 
                className={`${styles.btn} ${styles.btnOutline}`}
                style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}
              >
                🔄 Sincronizar API en Vivo
              </button>
              <button 
                onClick={handleResetMatches} 
                className={`${styles.btn} ${styles.btnDanger}`}
              >
                🗑️ Reiniciar Datos Oficiales
              </button>
            </div>
          </div>
        </section>

        {/* Matches Area */}
        <section className={styles.contentArea}>
          {/* Tabs Navigation (Reordered) */}
          <div className={styles.tabs}>
            <div 
              className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Todos
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'live' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('live')}
            >
              En Vivo
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Próximos
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'finished' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('finished')}
            >
              Finalizados
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'knockout' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('knockout')}
            >
              Fase Final (Llaves)
            </div>
            <div 
              className={`${styles.tab} ${activeTab === 'groups' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              Tablas de Grupos
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
            </div>
          ) : error ? (
            <div className={`${styles.emptyState} glass`}>
              <div className={styles.emptyIcon}>⚠️</div>
              <p>{error}</p>
              <button onClick={() => fetchData()} className={`${styles.btn} ${styles.btnOutline}`} style={{ marginTop: '1rem', width: 'auto' }}>
                Reintentar
              </button>
            </div>
          ) : activeTab === 'groups' ? (
            /* Groups standings View */
            <div className={styles.standingsContainer}>
              {Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i)).map(g => {
                const standings = calculateGroupStandings(g);
                const color = GROUP_COLORS[g] || '#cbd5e1';
                return (
                  <div 
                    key={g} 
                    className={`${styles.groupTableCard} glass`}
                    style={{ borderLeft: `4px solid ${color}` }}
                  >
                    <div className={styles.groupTableHeader}>
                      <span className={styles.groupTableTitle}>Grupo {g}</span>
                      <span 
                        className="badge" 
                        style={{ background: `${color}15`, color: color, borderColor: `${color}30` }}
                      >
                        FIFA 2026
                      </span>
                    </div>

                    <div className={styles.groupTableWrapper}>
                      <table className={styles.groupTable}>
                        <thead>
                          <tr>
                            <th>Selección</th>
                            <th className={styles.tableTextCenter}>PJ</th>
                            <th className={styles.tableTextCenter}>G</th>
                            <th className={styles.tableTextCenter}>E</th>
                            <th className={styles.tableTextCenter}>P</th>
                            <th className={styles.tableTextCenter}>GF:GC</th>
                            <th className={styles.tableTextCenter}>DG</th>
                            <th className={styles.tableTextRight}>PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((std, idx) => (
                            <tr key={std.team.id}>
                              <td className={styles.tableTeamCell}>
                                <span style={{ width: '15px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</span>
                                <img src={std.team.flag} alt={std.team.name_en} className={styles.flag} style={{ width: '22px', height: '15px' }} />
                                <span 
                                  className={styles.teamNameLink} 
                                  onClick={() => {
                                    setSelectedTeam(std.team.id);
                                    setActiveTab('all');
                                    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
                                      setIsMobileFiltersOpen(false); // Close filters panel if open on mobile
                                    }
                                  }}
                                >
                                  {TEAM_NAMES_ES[std.team.name_en] || std.team.name_en}
                                </span>
                              </td>
                              <td className={styles.tableTextCenter}>{std.played}</td>
                              <td className={styles.tableTextCenter}>{std.won}</td>
                              <td className={styles.tableTextCenter}>{std.drawn}</td>
                              <td className={styles.tableTextCenter}>{std.lost}</td>
                              <td className={styles.tableTextCenter}>{std.gf}:{std.ga}</td>
                              <td className={styles.tableTextCenter} style={{ color: std.gd > 0 ? '#16a34a' : std.gd < 0 ? '#ef4444' : 'inherit' }}>
                                {std.gd > 0 ? `+${std.gd}` : std.gd}
                              </td>
                              <td className={`${styles.tableTextRight} ${styles.tableBold}`}>{std.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Matches List View */
            <>
              {/* Filter Preview Label */}
              <div className={styles.filterHeader}>
                <span className={styles.matchesCount}>
                  Mostrando {filteredMatchesForDisplay.length} de {matches.length} partidos
                </span>
              </div>

              {filteredMatchesForDisplay.length === 0 ? (
                <div className={`${styles.emptyState} glass`}>
                  <div className={styles.emptyIcon}>⚽</div>
                  <p>No se encontraron partidos con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className={styles.matchesList}>
                  {filteredMatchesForDisplay.map((match) => {
                    const homeTeam = teamMap.get(match.home_team_id);
                    const awayTeam = teamMap.get(match.away_team_id);
                    
                    const isFinished = match.finished === 'TRUE';
                    const isLive = match.time_elapsed !== 'notstarted' && !isFinished;
                    
                    // Get labels
                    let homeLabelName = homeTeam ? (TEAM_NAMES_ES[homeTeam.name_en] || homeTeam.name_en) : '';
                    let awayLabelName = awayTeam ? (TEAM_NAMES_ES[awayTeam.name_en] || awayTeam.name_en) : '';
                    
                    if (match.home_team_id === '0') {
                      homeLabelName = match.home_team_label
                        ? match.home_team_label
                            .replace('Winner Match', 'Ganador Partido')
                            .replace('Loser Match', 'Perdedor Partido')
                        : 'Por definir';
                    }
                    
                    if (match.away_team_id === '0') {
                      awayLabelName = match.away_team_label
                        ? match.away_team_label
                            .replace('Winner Match', 'Ganador Partido')
                            .replace('Loser Match', 'Perdedor Partido')
                        : 'Por definir';
                    }

                    const matchGroupColor = GROUP_COLORS[match.group] || 'hsl(var(--accent))';
                    const leftBorderColor = match.type === 'group' ? matchGroupColor : '#facc15';

                    return (
                      <div 
                        key={match.id} 
                        className={`${styles.matchCard} glass glass-hover`}
                        style={{ borderLeftColor: leftBorderColor }}
                      >
                        <div className={styles.matchDetails}>
                          {/* Top Info */}
                          <div className={styles.matchHeaderInfo}>
                            <span>Partido #{match.id}</span>
                            <div>
                              {isFinished ? (
                                <span className="badge badge-finished">Finalizado</span>
                              ) : isLive ? (
                                <span className="badge badge-live">
                                  <span className="pulse-live-indicator"></span> En Vivo - {match.time_elapsed === 'halftime' ? 'ET' : `${match.time_elapsed}'`}
                                </span>
                              ) : (
                                <span className="badge">Programado</span>
                              )}
                              
                              {/* Clicking Group Badge shows standings modal */}
                              {match.type === 'group' ? (
                                <span 
                                  className={`badge ${styles.groupBadgeLink}`}
                                  style={{ 
                                    marginLeft: '0.5rem', 
                                    background: `${matchGroupColor}15`, 
                                    color: matchGroupColor, 
                                    borderColor: `${matchGroupColor}30` 
                                  }}
                                  onClick={() => setSelectedGroupModal(match.group)}
                                  title="Ver Tabla del Grupo"
                                >
                                  Grupo {match.group}
                                </span>
                              ) : (
                                <span className="badge badge-knockout" style={{ marginLeft: '0.5rem' }}>
                                  {match.group}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Scoreboard display */}
                          <div className={styles.matchTeams}>
                            <div className={`${styles.team} ${styles.homeTeam}`}>
                              {homeTeam ? (
                                <span 
                                  className={`${styles.teamName} ${styles.teamNameLink}`}
                                  onClick={() => setSelectedTeam(homeTeam.id)}
                                >
                                  {homeLabelName}
                                </span>
                              ) : (
                                <span className={styles.teamName}>{homeLabelName}</span>
                              )}
                              {homeTeam ? (
                                <img src={homeTeam.flag} alt={homeTeam.name_en} className={styles.flag} />
                              ) : (
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚔️</span>
                              )}
                            </div>

                            <div className={styles.scoreContainer}>
                              {isLive || isFinished ? (
                                <div className={styles.score}>
                                  <span>{match.home_score}</span>
                                  <span>-</span>
                                  <span>{match.away_score}</span>
                                </div>
                              ) : (
                                <div className={styles.vs}>VS</div>
                              )}
                            </div>

                            <div className={`${styles.team} ${styles.awayTeam}`}>
                              {awayTeam ? (
                                <img src={awayTeam.flag} alt={awayTeam.name_en} className={styles.flag} />
                              ) : (
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚔️</span>
                              )}
                              {awayTeam ? (
                                <span 
                                  className={`${styles.teamName} ${styles.teamNameLink}`}
                                  onClick={() => setSelectedTeam(awayTeam.id)}
                                >
                                  {awayLabelName}
                                </span>
                              ) : (
                                <span className={styles.teamName}>{awayLabelName}</span>
                              )}
                            </div>
                          </div>

                          {/* Location and Localized Date */}
                          <div className={styles.matchFooter}>
                            <div className={styles.stadium}>
                              🏟️ {getStadiumDetailsText(match.stadium_id)}
                            </div>
                            <div className={styles.date}>
                              📅 {formatMatchDate(match.local_date, match.stadium_id)}
                            </div>
                          </div>
                        </div>

                        {/* Simulation Action Trigger */}
                        <button 
                          onClick={() => openSimulator(match)}
                          className={`${styles.btn} ${styles.btnOutline} ${styles.simulatorTrigger}`}
                          style={{ width: 'auto', padding: '0.5rem 0.75rem', alignSelf: 'center' }}
                          title="Simular Resultado"
                        >
                          ✏️ Simular
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Simulator Modal */}
      {editingMatch && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass`}>
            <button className={styles.closeButton} onClick={() => setEditingMatch(null)}>
              &times;
            </button>

            <div className={styles.simulatorHeader}>
              <h3 className={styles.simulatorTitle}>
                ✏️ Simular Partido #{editingMatch.id}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {editingMatch.type === 'group' ? `Fase de Grupos - Grupo ${editingMatch.group}` : 'Fase de Eliminación Directa'}
              </p>
            </div>

            <form onSubmit={saveSimulation}>
              {/* If it's a knockout match, allow choosing which teams qualified */}
              {editingMatch.type !== 'group' && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Equipo Local:</label>
                    <select 
                      className={styles.select}
                      value={simHomeTeamId}
                      onChange={(e) => setSimHomeTeamId(e.target.value)}
                    >
                      <option value="0">❓ {editingMatch.home_team_label || 'Por definir'}</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {TEAM_NAMES_ES[t.name_en] || t.name_en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label>Equipo Visitante:</label>
                    <select 
                      className={styles.select}
                      value={simAwayTeamId}
                      onChange={(e) => setSimAwayTeamId(e.target.value)}
                    >
                      <option value="0">❓ {editingMatch.away_team_label || 'Por definir'}</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {TEAM_NAMES_ES[t.name_en] || t.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Score Inputs */}
              <div className={styles.scoreInputContainer}>
                <div className={styles.scoreInputGroup}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Goles Local</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="99" 
                    className={styles.scoreInput}
                    value={simHomeScore}
                    onChange={(e) => setSimHomeScore(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '2rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>-</div>
                <div className={styles.scoreInputGroup}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Goles Visitante</span>
                  <input 
                    type="number" 
                    min="0" 
                    max="99" 
                    className={styles.scoreInput}
                    value={simAwayScore}
                    onChange={(e) => setSimAwayScore(e.target.value)}
                  />
                </div>
              </div>

              {/* Status form fields */}
              <div className={styles.formGroup}>
                <label htmlFor="sim-status">Estado del Partido:</label>
                <select 
                  id="sim-status"
                  className={styles.select}
                  value={simTimeElapsed}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSimTimeElapsed(val);
                    if (val === 'finished') {
                      setSimFinished(true);
                    } else if (val === 'notstarted') {
                      setSimFinished(false);
                    }
                  }}
                >
                  <option value="notstarted">📅 Programado / No Iniciado</option>
                  <option value="15">🔴 En Curso - Primer Tiempo (Min 15)</option>
                  <option value="halftime">🔴 En Curso - Entretiempo (ET)</option>
                  <option value="75">🔴 En Curso - Segundo Tiempo (Min 75)</option>
                  <option value="finished">✅ Finalizado</option>
                </select>
              </div>

              {/* Finished Toggle */}
              {simTimeElapsed !== 'notstarted' && simTimeElapsed !== 'finished' && (
                <div className={styles.checkboxGroup} onClick={() => setSimFinished(!simFinished)} style={{ marginTop: '1rem' }}>
                  <input 
                    type="checkbox" 
                    checked={simFinished} 
                    onChange={() => {}} 
                    style={{ pointerEvents: 'none' }}
                  />
                  <span className={styles.checkboxLabel}>¿Marcar partido como finalizado?</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className={styles.simulatorModalActions}>
                <button 
                  type="button" 
                  onClick={() => setEditingMatch(null)} 
                  className={`${styles.btn} ${styles.btnOutline}`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`${styles.btn} ${styles.btnAccent}`}
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standings Modal Popup */}
      {selectedGroupModal && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGroupModal(null)}>
          <div 
            className={`${styles.modalContent} glass`}
            style={{ 
              borderLeft: `4px solid ${GROUP_COLORS[selectedGroupModal] || '#cbd5e1'}`, 
              maxWidth: '550px' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={() => setSelectedGroupModal(null)}>
              &times;
            </button>

            <div className={styles.simulatorHeader}>
              <h3 className={styles.simulatorTitle}>
                📈 Tabla de Posiciones - Grupo {selectedGroupModal}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Fase de Grupos (Calculado en tiempo real)
              </p>
            </div>

            <div className={styles.groupTableWrapper} style={{ marginTop: '1rem' }}>
              <table className={styles.groupTable}>
                <thead>
                  <tr>
                    <th>Selección</th>
                    <th className={styles.tableTextCenter}>PJ</th>
                    <th className={styles.tableTextCenter}>G</th>
                    <th className={styles.tableTextCenter}>E</th>
                    <th className={styles.tableTextCenter}>P</th>
                    <th className={styles.tableTextCenter}>GF:GC</th>
                    <th className={styles.tableTextCenter}>DG</th>
                    <th className={styles.tableTextRight}>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateGroupStandings(selectedGroupModal).map((std, idx) => (
                    <tr key={std.team.id}>
                      <td className={styles.tableTeamCell}>
                        <span style={{ width: '15px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</span>
                        <img src={std.team.flag} alt={std.team.name_en} className={styles.flag} style={{ width: '22px', height: '15px' }} />
                        <span 
                          className={styles.teamNameLink} 
                          onClick={() => {
                            setSelectedTeam(std.team.id);
                            setSelectedGroupModal(null);
                            setActiveTab('all');
                            if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
                              setIsMobileFiltersOpen(false); // Close filters panel if open on mobile
                            }
                          }}
                        >
                          {TEAM_NAMES_ES[std.team.name_en] || std.team.name_en}
                        </span>
                      </td>
                      <td className={styles.tableTextCenter}>{std.played}</td>
                      <td className={styles.tableTextCenter}>{std.won}</td>
                      <td className={styles.tableTextCenter}>{std.drawn}</td>
                      <td className={styles.tableTextCenter}>{std.lost}</td>
                      <td className={styles.tableTextCenter}>{std.gf}:{std.ga}</td>
                      <td className={styles.tableTextCenter} style={{ color: std.gd > 0 ? '#16a34a' : std.gd < 0 ? '#ef4444' : 'inherit' }}>
                        {std.gd > 0 ? `+${std.gd}` : std.gd}
                      </td>
                      <td className={`${styles.tableTextRight} ${styles.tableBold}`}>{std.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button 
              type="button" 
              onClick={() => setSelectedGroupModal(null)} 
              className={`${styles.btn} ${styles.btnOutline}`}
              style={{ marginTop: '1.5rem' }}
            >
              Cerrar tabla
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
