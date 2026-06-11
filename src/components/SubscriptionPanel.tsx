"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Bell, Calendar, CalendarPlus, Check, ChevronDown, Copy, Download,
  Globe, Link2, RefreshCw, SlidersHorizontal, Smartphone, Trash2, Wrench
} from 'lucide-react';
import { Team, Stadium, TEAM_NAMES_ES, CITY_NAMES_ES } from '@/lib/utils';
import { TV_REGIONS } from '@/lib/constants';
import styles from '@/app/page.module.css';

// window.location.origin via useSyncExternalStore: deterministic fallback
// during SSR, real origin right after hydration
const emptySubscribe = () => () => {};
const getClientOrigin = () => window.location.origin;
const getServerOrigin = () => 'https://calendario-mf2026.vercel.app';

interface SubscriptionPanelProps {
  teams: Team[];
  stadiums: Stadium[];
  selectedTeam: string;
  setSelectedTeam: (id: string) => void;
  selectedGroup: string;
  setSelectedGroup: (g: string) => void;
  selectedStadium: string;
  setSelectedStadium: (id: string) => void;
  simulatorEnabled: boolean;
  onSync: () => void;
  onReset: () => void;
}

export default function SubscriptionPanel({
  teams, stadiums,
  selectedTeam, setSelectedTeam,
  selectedGroup, setSelectedGroup,
  selectedStadium, setSelectedStadium,
  simulatorEnabled, onSync, onReset
}: SubscriptionPanelProps) {
  const [selectedRegion, setSelectedRegion] = useState('general');
  const [isTvDropdownOpen, setIsTvDropdownOpen] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmMinutes, setAlarmMinutes] = useState(15);
  const [scoresEnabled, setScoresEnabled] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const origin = useSyncExternalStore(emptySubscribe, getClientOrigin, getServerOrigin);

  const activeTvOption = TV_REGIONS.find(r => r.code === selectedRegion) || TV_REGIONS[0];

  // Close TV dropdown on outside click or Escape
  useEffect(() => {
    if (!isTvDropdownOpen) return;
    const handleOutsideClick = () => setIsTvDropdownOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsTvDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTvDropdownOpen]);

  // Build the subscription URL with filters encoded in the PATH (no query
  // string): Google and other calendar clients mangle & in subscription
  // URLs, so /api/calendar/mundial2026_team-1_region-pe.ics is bulletproof
  const filterParts = ['mundial2026'];
  if (selectedTeam) filterParts.push(`team-${selectedTeam}`);
  if (selectedGroup) filterParts.push(`group-${selectedGroup}`);
  if (selectedStadium) filterParts.push(`stadium-${selectedStadium}`);
  if (selectedRegion !== 'general') filterParts.push(`region-${selectedRegion}`);
  if (!alarmEnabled) filterParts.push('alarm-off');
  else if (alarmMinutes !== 15) filterParts.push(`alarmmin-${alarmMinutes}`);
  if (!scoresEnabled) filterParts.push('scores-off');

  const calendarHttpUrl = `${origin}/api/calendar/${filterParts.join('_')}.ics`;
  const calendarWebcalUrl = calendarHttpUrl.replace(/^https?:\/\//i, 'webcal://');
  // Classic Google subscribe link; with a clean param-free URL it works
  // reliably in the desktop/web flow
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarWebcalUrl)}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarWebcalUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error al copiar', err);
    }
  };

  // Teams grouped A-L for a scannable select
  const groupLetters = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i));
  const teamName = (t: Team) => TEAM_NAMES_ES[t.name_en] || t.name_en;

  return (
    <>
      <div className={`${styles.configPanel} glass`}>
        <h2 className={styles.panelTitle}>
          <SlidersHorizontal size={20} aria-hidden="true" /> Filtros de Suscripción
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
            <option value="">Todos los equipos</option>
            {groupLetters.map(g => (
              <optgroup key={g} label={`Grupo ${g}`}>
                {teams
                  .filter(t => t.groups === g)
                  .sort((a, b) => teamName(a).localeCompare(teamName(b)))
                  .map(t => (
                    <option key={t.id} value={t.id}>{teamName(t)}</option>
                  ))}
              </optgroup>
            ))}
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
            <option value="">Todos los grupos</option>
            {groupLetters.map(g => (
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
            <option value="">Todos los estadios</option>
            {stadiums.map(s => (
              <option key={s.id} value={s.id}>
                {s.name_en} ({CITY_NAMES_ES[s.city_en] || s.city_en})
              </option>
            ))}
          </select>
        </div>

        {/* TV Region Selector (custom dropdown to render flag images) */}
        <div className={styles.formGroup} style={{ position: 'relative' }}>
          <span id="tv-region-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Guía de Canales de TV:</span>
          <div className={styles.customSelect}>
            <button
              type="button"
              className={styles.customSelectTrigger}
              style={{ width: '100%', cursor: 'pointer', fontFamily: 'inherit' }}
              aria-haspopup="listbox"
              aria-expanded={isTvDropdownOpen}
              aria-labelledby="tv-region-label"
              onClick={(e) => {
                e.stopPropagation();
                setIsTvDropdownOpen(!isTvDropdownOpen);
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeTvOption.flagUrl ? (
                  <img src={activeTvOption.flagUrl} alt="" className={styles.selectFlag} />
                ) : (
                  <Globe size={16} aria-hidden="true" />
                )}
                <span>{activeTvOption.name}</span>
              </span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={styles.arrow}
                style={{ transform: isTvDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {isTvDropdownOpen && (
              <div className={styles.customSelectOptions} role="listbox" aria-labelledby="tv-region-label">
                {TV_REGIONS.map(regionOpt => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedRegion === regionOpt.code}
                    key={regionOpt.code}
                    className={`${styles.customSelectOption} ${selectedRegion === regionOpt.code ? styles.customSelectOptionActive : ''}`}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    onClick={() => {
                      setSelectedRegion(regionOpt.code);
                      setIsTvDropdownOpen(false);
                    }}
                  >
                    {regionOpt.flagUrl ? (
                      <img src={regionOpt.flagUrl} alt="" className={styles.selectFlag} />
                    ) : (
                      <Globe size={16} aria-hidden="true" />
                    )}
                    <span>{regionOpt.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle options */}
        <div style={{ marginTop: '1.5rem' }}>
          <div className={styles.checkboxGroup}>
            <input
              id="scores-toggle"
              type="checkbox"
              checked={scoresEnabled}
              onChange={(e) => setScoresEnabled(e.target.checked)}
            />
            <label htmlFor="scores-toggle" className={styles.checkboxLabel} style={{ cursor: 'pointer' }}>
              Actualizar con marcadores en tiempo real
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <input
              id="alarm-toggle"
              type="checkbox"
              checked={alarmEnabled}
              onChange={(e) => setAlarmEnabled(e.target.checked)}
            />
            <label htmlFor="alarm-toggle" className={styles.checkboxLabel} style={{ cursor: 'pointer' }}>
              Incluir alertas de recordatorio
            </label>
          </div>

          {alarmEnabled && (
            <div className={styles.sliderContainer}>
              <div className={styles.sliderHeader}>
                <label htmlFor="alarm-minutes">
                  <Bell size={12} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  Recordar antes del partido
                </label>
                <span style={{ color: 'var(--wc-gold)', fontWeight: 'bold' }}>{alarmMinutes} min</span>
              </div>
              <input
                id="alarm-minutes"
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

        {/* Generated Subscription URL */}
        <div className={styles.urlBox}>
          <div className={styles.urlTitle}>
            <Link2 size={13} aria-hidden="true" style={{ verticalAlign: 'text-bottom', marginRight: '0.3rem' }} />
            Enlace de Suscripción
          </div>
          <div className={styles.urlText}>{calendarWebcalUrl}</div>
        </div>

        {/* Subscription Actions */}
        <div className={styles.actionsContainer}>
          <button onClick={handleCopyUrl} className={`${styles.btn} ${styles.btnPrimary}`}>
            {copySuccess ? (<><Check size={16} aria-hidden="true" /> ¡Copiado!</>) : (<><Copy size={16} aria-hidden="true" /> Copiar URL Webcal</>)}
          </button>

          <a href={calendarWebcalUrl} className={`${styles.btn} ${styles.btnOutline}`} style={{ textAlign: 'center' }}>
            <Calendar size={16} aria-hidden="true" /> Suscribirse (Apple / iCal)
          </a>

          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className={`${styles.btn} ${styles.btnOutline}`}
            style={{ textAlign: 'center' }}
          >
            <CalendarPlus size={16} aria-hidden="true" /> Añadir a Google Calendar
          </a>

          <a
            href={calendarHttpUrl}
            download="mundial2026.ics"
            className={`${styles.btn} ${styles.btnOutline}`}
            style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}
          >
            <Download size={16} aria-hidden="true" /> Descargar archivo .ics
          </a>
        </div>

        {/* Google URL-subscriptions don't sync to phones by default — walk
            the user through it instead of letting them think it's broken */}
        <details className={styles.helpBox}>
          <summary className={styles.helpSummary}>
            <Smartphone size={15} aria-hidden="true" /> ¿No aparece el calendario en tu móvil?
          </summary>
          <div className={styles.helpContent}>
            <p>
              Google solo admite calendarios por URL desde su <strong>versión web</strong>, y además
              <strong> no los sincroniza al móvil</strong> hasta que tú lo actives. Sigue estos 3 pasos:
            </p>
            <ol>
              <li>
                <strong>Desde un ordenador</strong>, pulsa «Añadir a Google Calendar» y confirma.
                <em> Desde el móvil no uses el diálogo de la app (Google falla en silencio):</em>{' '}
                pulsa «Copiar URL Webcal», entra a{' '}
                <a href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noreferrer">
                  Google Calendar → Desde una URL
                </a>
                , pega la dirección y toca <strong>«Agregar calendario»</strong>.
              </li>
              <li>
                Activa la sincronización al móvil: entra a{' '}
                <a href="https://calendar.google.com/calendar/syncselect" target="_blank" rel="noreferrer">
                  calendar.google.com/calendar/syncselect
                </a>
                , marca <strong>«Mundial de Fútbol 2026»</strong> y pulsa <strong>Guardar</strong>.
              </li>
              <li>
                En el celular, abre la app de <strong>Google Calendar</strong> y desliza hacia abajo
                para refrescar. Luego abre el menú <strong>☰</strong>: si no ves «Mundial de Fútbol
                2026» en la lista, toca <strong>«Ver más»</strong> bajo tu cuenta para desplegar
                todos los calendarios, y <strong>márcalo</strong> para hacerlo visible.
              </li>
              <li>
                En <strong>☰ → Ajustes → «Mundial de Fútbol 2026»</strong> (bajo tu cuenta),
                comprueba que <strong>«Sincronización»</strong> esté activada — así los partidos se
                mantendrán actualizados aunque cierres la app.
              </li>
              <li>
                <strong>🔔 Activa los recordatorios:</strong> Google ignora las alertas incluidas en
                los calendarios por URL, así que configúralas una sola vez: en{' '}
                <a href="https://calendar.google.com" target="_blank" rel="noreferrer">calendar.google.com</a>{' '}
                → ⚙️ <strong>Configuración</strong> → <strong>«Mundial de Fútbol 2026»</strong> (bajo
                «Configuración de otros calendarios») → <strong>Notificaciones de eventos</strong> →
                «Añadir notificación» y elige los minutos de antelación. Se aplicará a todos los
                partidos, también en el móvil. <em>(En Apple Calendar y Outlook las alertas del feed
                funcionan sin pasos extra.)</em>
              </li>
            </ol>
            <p>
              La primera descarga de los partidos puede tardar <strong>unos minutos</strong>. Google
              actualiza los calendarios por URL <strong>cada 8-24 horas</strong>; para actualizaciones
              cada hora usa <strong>Apple Calendar</strong> u <strong>Outlook</strong>, que respetan la
              frecuencia del feed.
            </p>
          </div>
        </details>
      </div>

      {/* Simulator Panel (development / explicitly enabled only) */}
      {simulatorEnabled && (
        <div className={`${styles.configPanel} glass`} style={{ borderStyle: 'dashed', borderColor: 'rgba(250, 204, 21, 0.2)' }}>
          <h3 className={styles.panelTitle} style={{ color: 'var(--wc-gold)' }}>
            <Wrench size={18} aria-hidden="true" /> Panel de Simulación
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Cambia marcadores, clasificados de llaves o estados de partidos en local y refresca tu app de calendario para verificar la sincronización instantánea.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <button onClick={onSync} className={`${styles.btn} ${styles.btnOutline}`} style={{ borderColor: 'rgba(0, 87, 184, 0.3)' }}>
              <RefreshCw size={16} aria-hidden="true" /> Sincronizar API en Vivo
            </button>
            <button onClick={onReset} className={`${styles.btn} ${styles.btnDanger}`}>
              <Trash2 size={16} aria-hidden="true" /> Reiniciar Datos Oficiales
            </button>
          </div>
        </div>
      )}
    </>
  );
}
