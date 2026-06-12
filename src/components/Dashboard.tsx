"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { CalendarSearch, ChevronDown, ChevronUp, Clock, Moon, SlidersHorizontal, Sun, Trophy } from 'lucide-react';
import { Match, Team, Stadium, CITY_NAMES_ES, getUtcDate } from '@/lib/utils';
import { GROUP_COLORS } from '@/lib/constants';
import MatchCard from './MatchCard';
import GroupStandingsTable from './GroupStandingsTable';
import SubscriptionPanel from './SubscriptionPanel';
import SimulatorModal from './SimulatorModal';
import StandingsModal from './StandingsModal';
import styles from '@/app/page.module.css';

interface DashboardProps {
  initialMatches: Match[];
  teams: Team[];
  stadiums: Stadium[];
  simulatorEnabled: boolean;
}

type TabId = 'all' | 'live' | 'upcoming' | 'finished' | 'knockout' | 'groups';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'live', label: 'En Vivo' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'finished', label: 'Finalizados' },
  { id: 'knockout', label: 'Fase Final' },
  { id: 'groups', label: 'Grupos' }
];

const GROUP_LETTERS = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i));

// External browser state read via useSyncExternalStore: the server snapshot
// is deterministic and the client value kicks in right after hydration
const emptySubscribe = () => () => {};
const getClientTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerTimeZone = () => 'UTC';

// Theme lives on <html> (set pre-paint by the layout script); toggling
// notifies subscribers so React re-reads the class
let themeListeners: Array<() => void> = [];
const subscribeTheme = (listener: () => void) => {
  themeListeners.push(listener);
  return () => {
    themeListeners = themeListeners.filter(l => l !== listener);
  };
};
const getClientIsLight = () => !document.documentElement.classList.contains('dark-theme');
const getServerIsLight = () => true;

// Shared 10-second wall clock for countdowns and live-minute estimates.
// Snapshot only changes when the timer fires, so renders stay consistent;
// the server snapshot (0) keeps hydration deterministic.
let nowListeners: Array<() => void> = [];
let nowTimer: ReturnType<typeof setInterval> | null = null;
let nowSnapshot = typeof window !== 'undefined' ? Date.now() : 0;
const subscribeNow = (listener: () => void) => {
  nowListeners.push(listener);
  if (!nowTimer) {
    nowTimer = setInterval(() => {
      nowSnapshot = Date.now();
      nowListeners.forEach(l => l());
    }, 10_000);
  }
  return () => {
    nowListeners = nowListeners.filter(l => l !== listener);
    if (nowListeners.length === 0 && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = null;
    }
  };
};
const getNowSnapshot = () => nowSnapshot;
const getServerNow = () => 0;

export default function Dashboard({ initialMatches, teams, stadiums, simulatorEnabled }: DashboardProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar filters shared with the match list
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStadium, setSelectedStadium] = useState('');

  const isLightTheme = useSyncExternalStore(subscribeTheme, getClientIsLight, getServerIsLight);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedGroupModal, setSelectedGroupModal] = useState<string | null>(null);

  // UTC during SSR/hydration; the user's zone right after hydration
  const timeZone = useSyncExternalStore(emptySubscribe, getClientTimeZone, getServerTimeZone);

  // Ticks every 10 s; 0 during SSR/hydration
  const now = useSyncExternalStore(subscribeNow, getNowSnapshot, getServerNow);

  const toggleTheme = () => {
    const nowDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('theme', nowDark ? 'dark' : 'light');
    themeListeners.forEach(l => l());
  };

  const fetchData = async (forceRefresh = false, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const res = await fetch(`/api/matches${forceRefresh ? '?refresh=true' : ''}`);
      if (!res.ok) throw new Error('Error al cargar la información del servidor');
      const data = await res.json();
      setMatches(data.matches);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Live polling: silent refresh, faster while a match is in progress
  const hasLiveMatch = matches.some(m => m.time_elapsed !== 'notstarted' && m.finished !== 'TRUE');
  useEffect(() => {
    const id = setInterval(() => {
      fetchData(false, true);
    }, hasLiveMatch ? 30_000 : 60_000);
    return () => clearInterval(id);
  }, [hasLiveMatch]);

  const handleResetMatches = async () => {
    if (!confirm('¿Estás seguro de que quieres restablecer todos los partidos al calendario inicial oficial?')) return;
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
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setActiveTab('all');
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setIsMobileFiltersOpen(false);
    }
  };

  const teamMap = useMemo(() => new Map<string, Team>(teams.map(t => [t.id, t])), [teams]);
  const stadiumMap = useMemo(() => new Map<string, Stadium>(stadiums.map(s => [s.id, s])), [stadiums]);

  const getStadiumDetailsText = (stadiumId: string) => {
    const stadium = stadiumMap.get(stadiumId);
    if (!stadium) return 'Estadio Desconocido';
    const city = CITY_NAMES_ES[stadium.city_en] || stadium.city_en;
    const country = stadium.country_en === 'United States' ? 'EE. UU.' : stadium.country_en;
    return `${stadium.name_en} (${city}, ${country})`;
  };

  // Filter matches based on tab + sidebar filters
  const filteredMatches = matches.filter(match => {
    const isFinished = match.finished === 'TRUE';
    const isLive = match.time_elapsed !== 'notstarted' && !isFinished;
    const isUpcoming = match.time_elapsed === 'notstarted' && !isFinished;

    if (activeTab === 'live' && !isLive) return false;
    if (activeTab === 'upcoming' && !isUpcoming) return false;
    if (activeTab === 'finished' && !isFinished) return false;
    if (activeTab === 'knockout' && match.type === 'group') return false;

    if (selectedTeam && match.home_team_id !== selectedTeam && match.away_team_id !== selectedTeam) return false;
    if (selectedGroup && match.group.toUpperCase() !== selectedGroup.toUpperCase()) return false;
    if (selectedStadium && match.stadium_id !== selectedStadium) return false;

    return true;
  });

  // Group matches by calendar day in the active time zone
  const dayKeyFmt = useMemo(() => new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }), [timeZone]);
  const dayLabelFmt = useMemo(() => new Intl.DateTimeFormat('es-ES', {
    timeZone, weekday: 'long', day: 'numeric', month: 'long'
  }), [timeZone]);
  const timeFmt = useMemo(() => new Intl.DateTimeFormat('es-ES', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false
  }), [timeZone]);

  const currentDate = now > 0 ? new Date(now) : new Date();
  const todayKey = dayKeyFmt.format(currentDate);
  const tomorrowKey = dayKeyFmt.format(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));

  const matchDays = useMemo(() => {
    const sorted = [...filteredMatches].sort((a, b) => {
      const tA = getUtcDate(a.local_date, a.stadium_id).getTime();
      const tB = getUtcDate(b.local_date, b.stadium_id).getTime();
      return tA - tB || Number(a.id) - Number(b.id);
    });

    const days: { key: string; matches: Match[] }[] = [];
    for (const match of sorted) {
      const key = dayKeyFmt.format(getUtcDate(match.local_date, match.stadium_id));
      const last = days[days.length - 1];
      if (last && last.key === key) {
        last.matches.push(match);
      } else {
        days.push({ key, matches: [match] });
      }
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, activeTab, selectedTeam, selectedGroup, selectedStadium, dayKeyFmt]);

  const dayLabel = (key: string, firstMatch: Match) => {
    if (key === todayKey) return 'Hoy';
    if (key === tomorrowKey) return 'Mañana';
    const label = dayLabelFmt.format(getUtcDate(firstMatch.local_date, firstMatch.stadium_id));
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const hasTodayGroup = matchDays.some(d => d.key === todayKey);
  const jumpToToday = () => {
    document.getElementById(`day-${todayKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className={`${styles.main} container`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.themeToggleContainer}>
          <button onClick={toggleTheme} className={styles.themeBtn} title="Cambiar tema">
            {isLightTheme
              ? (<><Moon size={15} aria-hidden="true" /> Modo Oscuro</>)
              : (<><Sun size={15} aria-hidden="true" /> Modo Claro</>)}
          </button>
        </div>

        <h1 className={`${styles.title} gradient-text gold-glow`}>
          <Trophy size={36} aria-hidden="true" style={{ verticalAlign: 'baseline', marginRight: '0.5rem', color: 'var(--wc-gold)' }} />
          Calendario Mundial de Fútbol 2026
        </h1>
        <p className={styles.subtitle}>
          Suscríbete de manera automática a tu calendario personal. Los horarios se adaptan automáticamente a tu huso horario y los resultados y llaves se actualizan en tiempo real.
        </p>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>{matches.length || 104}</div>
            <div className={styles.statLabel}>Partidos</div>
          </div>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>{teams.length || 48}</div>
            <div className={styles.statLabel}>Selecciones</div>
          </div>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>{stadiums.length || 16}</div>
            <div className={styles.statLabel}>Estadios</div>
          </div>
          <div className={`${styles.statCard} glass`}>
            <div className={styles.statValue}>3</div>
            <div className={styles.statLabel}>Países</div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className={styles.dashboardLayout}>
        {/* Mobile accordion toggle for filters */}
        <button
          className={styles.mobileFilterToggle}
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          aria-expanded={isMobileFiltersOpen}
          aria-controls="subscription-sidebar"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          {isMobileFiltersOpen ? 'Ocultar Filtros de Suscripción' : 'Configurar Suscripción'}
          {isMobileFiltersOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>

        {/* Sidebar Configurator */}
        <section
          id="subscription-sidebar"
          className={`${styles.sidebar} ${!isMobileFiltersOpen ? styles.mobileCollapsed : ''}`}
          aria-label="Configurador de suscripción"
        >
          <SubscriptionPanel
            teams={teams}
            stadiums={stadiums}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            selectedStadium={selectedStadium}
            setSelectedStadium={setSelectedStadium}
            simulatorEnabled={simulatorEnabled}
            onSync={() => fetchData(true)}
            onReset={handleResetMatches}
          />
        </section>

        {/* Matches Area */}
        <section className={styles.contentArea} aria-label="Partidos y clasificaciones">
          {/* Tabs Navigation (APG pattern: roving tabindex + arrow keys) */}
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Filtrar partidos por estado"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              const idx = TABS.findIndex(t => t.id === activeTab);
              const next = e.key === 'ArrowRight'
                ? TABS[(idx + 1) % TABS.length]
                : TABS[(idx - 1 + TABS.length) % TABS.length];
              setActiveTab(next.id);
              (e.currentTarget.querySelector(`#tab-${next.id}`) as HTMLElement | null)?.focus();
            }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls="matches-panel"
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            id="matches-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} role="status" aria-label="Cargando"></div>
            </div>
          ) : error ? (
            <div className={`${styles.emptyState} glass`}>
              <div className={styles.emptyIcon} aria-hidden="true">⚠️</div>
              <p>{error}</p>
              <button onClick={() => fetchData()} className={`${styles.btn} ${styles.btnOutline}`} style={{ marginTop: '1rem', width: 'auto' }}>
                Reintentar
              </button>
            </div>
          ) : activeTab === 'groups' ? (
            /* Groups standings view */
            <>
              <div className={styles.tableLegend} style={{ marginTop: 0 }}>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: 'var(--wc-green)' }} aria-hidden="true"></span>
                  Clasifica a dieciseisavos (1º y 2º)
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: '#d97706' }} aria-hidden="true"></span>
                  Posible clasificado entre los 8 mejores terceros
                </span>
              </div>
              <div className={styles.standingsContainer}>
                {GROUP_LETTERS.map(g => {
                  const color = GROUP_COLORS[g] || '#cbd5e1';
                  return (
                    <div
                      key={g}
                      className={`${styles.groupTableCard} glass`}
                      style={{ borderLeft: `4px solid ${color}` }}
                    >
                      <div className={styles.groupTableHeader}>
                        <h2 className={styles.groupTableTitle}>Grupo {g}</h2>
                        <span className={`badge group-badge-${g}`}>
                          FIFA 2026
                        </span>
                      </div>
                      <GroupStandingsTable
                        group={g}
                        teams={teams}
                        matches={matches}
                        onSelectTeam={handleSelectTeam}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Matches list view, grouped by day */
            <>
              <div className={styles.filterHeader}>
                <span className={styles.matchesCount}>
                  Mostrando {filteredMatches.length} de {matches.length} partidos
                  {' · '}
                  <span className={styles.tzNote}>
                    <Clock size={12} aria-hidden="true" />
                    {timeZone !== 'UTC' ? `Horarios en tu hora local (${timeZone})` : 'Horarios en UTC'}
                  </span>
                </span>
                {hasTodayGroup && (
                  <button type="button" className={styles.jumpTodayBtn} onClick={jumpToToday}>
                    <CalendarSearch size={14} aria-hidden="true" /> Ir a hoy
                  </button>
                )}
              </div>

              {filteredMatches.length === 0 ? (
                <div className={`${styles.emptyState} glass`}>
                  <div className={styles.emptyIcon} aria-hidden="true">⚽</div>
                  <p>No se encontraron partidos con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className={styles.matchesList}>
                  {matchDays.map(day => (
                    <div key={day.key} id={`day-${day.key}`} className={styles.dayGroup}>
                      <h2 className={`${styles.dayHeader} ${day.key === todayKey ? styles.dayHeaderToday : ''}`}>
                        {dayLabel(day.key, day.matches[0])}
                      </h2>
                      {day.matches.map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          homeTeam={teamMap.get(match.home_team_id)}
                          awayTeam={teamMap.get(match.away_team_id)}
                          stadiumText={getStadiumDetailsText(match.stadium_id)}
                          timeText={timeFmt.format(getUtcDate(match.local_date, match.stadium_id))}
                          now={now}
                          simulatorEnabled={simulatorEnabled}
                          onSelectTeam={handleSelectTeam}
                          onShowGroup={setSelectedGroupModal}
                          onSimulate={setEditingMatch}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </section>
      </div>

      {/* Simulator Modal */}
      {editingMatch && (
        <SimulatorModal
          match={editingMatch}
          teams={teams}
          onClose={() => setEditingMatch(null)}
          onSaved={() => fetchData()}
        />
      )}

      {/* Standings Modal */}
      {selectedGroupModal && (
        <StandingsModal
          group={selectedGroupModal}
          teams={teams}
          matches={matches}
          onClose={() => setSelectedGroupModal(null)}
          onSelectTeam={handleSelectTeam}
        />
      )}
    </main>
  );
}
