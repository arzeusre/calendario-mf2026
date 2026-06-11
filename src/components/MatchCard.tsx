"use client";

import { CalendarClock, MapPin, Pencil, Swords } from 'lucide-react';
import { Match, Team, TEAM_NAMES_ES, translateTeamLabel, getPhaseName } from '@/lib/utils';
import { GROUP_COLORS } from '@/lib/constants';
import styles from '@/app/page.module.css';

interface MatchCardProps {
  match: Match;
  homeTeam?: Team;
  awayTeam?: Team;
  stadiumText: string;
  timeText: string;
  simulatorEnabled: boolean;
  onSelectTeam: (teamId: string) => void;
  onShowGroup: (group: string) => void;
  onSimulate: (match: Match) => void;
}

export default function MatchCard({
  match, homeTeam, awayTeam, stadiumText, timeText,
  simulatorEnabled, onSelectTeam, onShowGroup, onSimulate
}: MatchCardProps) {
  const isFinished = match.finished === 'TRUE';
  const isLive = match.time_elapsed !== 'notstarted' && !isFinished;

  const homeLabelName = homeTeam && match.home_team_id !== '0'
    ? (TEAM_NAMES_ES[homeTeam.name_en] || homeTeam.name_en)
    : translateTeamLabel(match.home_team_label);
  const awayLabelName = awayTeam && match.away_team_id !== '0'
    ? (TEAM_NAMES_ES[awayTeam.name_en] || awayTeam.name_en)
    : translateTeamLabel(match.away_team_label);

  const matchGroupColor = GROUP_COLORS[match.group] || 'hsl(var(--accent))';
  const leftBorderColor = match.type === 'group' ? matchGroupColor : 'var(--wc-gold)';

  const teamButton = (team: Team | undefined, label: string) =>
    team ? (
      <button
        type="button"
        className={`${styles.teamName} ${styles.teamNameLink}`}
        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer' }}
        onClick={() => onSelectTeam(team.id)}
        title={`Filtrar partidos de ${label}`}
      >
        {label}
      </button>
    ) : (
      <span className={styles.teamName}>{label}</span>
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
            ) : isLive ? (
              <span className="badge badge-live">
                <span className="pulse-live-indicator" aria-hidden="true"></span> En Vivo - {match.time_elapsed === 'halftime' ? 'ET' : `${match.time_elapsed}'`}
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
            {teamButton(homeTeam, homeLabelName)}
            {flagImg(homeTeam)}
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
            {flagImg(awayTeam)}
            {teamButton(awayTeam, awayLabelName)}
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
