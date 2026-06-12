"use client";

import { CalendarClock, MapPin, Pencil, Swords, Timer } from 'lucide-react';
import { Match, Team, TEAM_NAMES_ES, translateTeamLabel, getPhaseName, getLiveMinuteEstimate, getUtcDate } from '@/lib/utils';
import { GROUP_COLORS } from '@/lib/constants';
import styles from '@/app/page.module.css';

interface MatchCardProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  stadiumText: string;
  timeText: string;
  now: number; // shared wall clock (0 during SSR)
  simulatorEnabled: boolean;
  onSelectTeam: (teamId: string) => void;
  onShowGroup: (group: string) => void;
  onSimulate: (match: Match) => void;
}

export default function MatchCard({
  match, homeTeam, awayTeam, stadiumText, timeText, now,
  simulatorEnabled, onSelectTeam, onShowGroup, onSimulate
}: MatchCardProps) {
  const isFinished = match.finished === 'TRUE';
  const isLive = match.time_elapsed !== 'notstarted' && !isFinished;

  // Countdown / kickoff-pending states (only after hydration, when now > 0)
  const kickoffMs = getUtcDate(match.local_date, match.stadium_id).getTime();
  const minsToKickoff = now > 0 ? Math.ceil((kickoffMs - now) / 60000) : null;
  const minsSinceKickoff = now > 0 ? Math.floor((now - kickoffMs) / 60000) : null;
  const startsSoon = !isLive && !isFinished && minsToKickoff !== null && minsToKickoff >= 1 && minsToKickoff <= 60;
  // Kickoff time passed but the data source hasn't flipped to live yet:
  // brief "Por comenzar", then clock-estimated "En Juego" until it catches up
  const apiLagging = !isLive && !isFinished && minsSinceKickoff !== null && minsSinceKickoff >= 0 && minsSinceKickoff < 150;
  const aboutToStart = apiLagging && minsSinceKickoff < 3;
  const estimatedLive = apiLagging && minsSinceKickoff >= 3;
  // The reverse lag: the source forgot to close the match (stuck "live"
  // hours after kickoff) — stop claiming it's in progress
  const staleLive = isLive && minsSinceKickoff !== null && minsSinceKickoff > 160;
  const liveDetail = isLive
    ? getLiveMinuteEstimate(match.time_elapsed, kickoffMs, now)
    : estimatedLive
      ? getLiveMinuteEstimate('live', kickoffMs, now)
      : null;

  const homeLabelName = homeTeam && match.home_team_id !== '0'
    ? (TEAM_NAMES_ES[homeTeam.name_en] || homeTeam.name_en)
    : translateTeamLabel(match.home_team_label);
  const awayLabelName = awayTeam && match.away_team_id !== '0'
    ? (TEAM_NAMES_ES[awayTeam.name_en] || awayTeam.name_en)
    : translateTeamLabel(match.away_team_label);

  const matchGroupColor = GROUP_COLORS[match.group] || 'hsl(var(--accent))';
  const leftBorderColor = match.type === 'group' ? matchGroupColor : 'var(--wc-gold)';

  const teamButton = (team: Team | undefined, label: string, side: 'home' | 'away') =>
    team ? (
      <button
        type="button"
        className={`${styles.teamName} ${styles.teamNameLink} ${side === 'home' ? styles.teamNameHome : styles.teamNameAway}`}
        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}
        onClick={() => onSelectTeam(team.id)}
        title={`Filtrar partidos de ${label}`}
      >
        {label}
      </button>
    ) : (
      <span className={`${styles.teamName} ${side === 'home' ? styles.teamNameHome : styles.teamNameAway}`}>{label}</span>
    );

  const flagImg = (team: Team | undefined) =>
    team ? (
      <img src={team.flag} alt="" className={styles.flag} loading="lazy" />
    ) : (
      <Swords size={22} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    );

  return (
    <article className={`${styles.matchCard} glass glass-hover`} style={{ borderLeftColor: leftBorderColor }}>
      <div className={styles.matchDetails}>
        {/* Top Info */}
        <div className={styles.matchHeaderInfo}>
          <span>Partido #{match.id}</span>
          <div>
            {isFinished ? (
              <span className="badge badge-finished">Finalizado</span>
            ) : staleLive ? (
              <span className="badge badge-finished" title="La fuente de datos aún no confirma el cierre del partido">
                Final (por confirmar)
              </span>
            ) : isLive ? (
              <span className="badge badge-live">
                <span className="pulse-live-indicator" aria-hidden="true"></span>
                {' '}En Vivo{liveDetail ? ` · ${liveDetail}` : ''}
              </span>
            ) : estimatedLive ? (
              <span className="badge badge-live" title="Minuto estimado; la fuente de datos aún no confirma el inicio">
                <span className="pulse-live-indicator" aria-hidden="true"></span>
                {' '}En Juego{liveDetail ? ` · ${liveDetail}` : ''}
              </span>
            ) : startsSoon ? (
              <span className="badge badge-soon">
                <Timer size={11} aria-hidden="true" /> Empieza en {minsToKickoff} min
              </span>
            ) : aboutToStart ? (
              <span className="badge badge-soon">
                <span className="pulse-live-indicator" aria-hidden="true"></span> Por comenzar
              </span>
            ) : (
              <span className="badge">Programado</span>
            )}

            {match.type === 'group' ? (
              <button
                type="button"
                className={`badge group-badge-${match.group} ${styles.groupBadgeLink}`}
                style={{
                  marginLeft: '0.5rem',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: '0.725rem',
                  fontWeight: 700
                }}
                onClick={() => onShowGroup(match.group)}
                title={`Ver tabla del Grupo ${match.group}`}
              >
                Grupo {match.group}
              </button>
            ) : (
              <span className="badge badge-knockout" style={{ marginLeft: '0.5rem' }}>
                {getPhaseName(match)}
              </span>
            )}
          </div>
        </div>

        {/* Scoreboard */}
        <div className={styles.matchTeams}>
          <div className={`${styles.team} ${styles.homeTeam}`}>
            {teamButton(homeTeam, homeLabelName, 'home')}
            {flagImg(homeTeam)}
          </div>

          <div className={styles.scoreContainer}>
            {isLive || isFinished || estimatedLive ? (
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
            {flagImg(awayTeam)}
            {teamButton(awayTeam, awayLabelName, 'away')}
          </div>
        </div>

        {/* Location and localized time */}
        <div className={styles.matchFooter}>
          <div className={styles.stadium}>
            <MapPin size={14} aria-hidden="true" /> {stadiumText}
          </div>
          <div className={styles.date}>
            <CalendarClock size={14} aria-hidden="true" style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem' }} />
            {timeText}
          </div>
        </div>
      </div>

      {simulatorEnabled && (
        <button
          type="button"
          onClick={() => onSimulate(match)}
          className={`${styles.btn} ${styles.btnOutline} ${styles.simulatorTrigger}`}
          style={{ width: 'auto', padding: '0.5rem 0.75rem', alignSelf: 'center' }}
          title="Simular resultado"
        >
          <Pencil size={15} aria-hidden="true" /> Simular
        </button>
      )}
    </article>
  );
}
