"use client";

import { Match, Team, TEAM_NAMES_ES } from '@/lib/utils';
import { calculateGroupStandings } from '@/lib/standings';
import styles from '@/app/page.module.css';

interface GroupStandingsTableProps {
  group: string;
  teams: Team[];
  matches: Match[];
  onSelectTeam: (teamId: string) => void;
  showLegend?: boolean;
}

// Live group standings with qualification-zone highlighting:
// top 2 qualify directly, 3rd place may advance among the 8 best thirds
export default function GroupStandingsTable({ group, teams, matches, onSelectTeam, showLegend = false }: GroupStandingsTableProps) {
  const standings = calculateGroupStandings(group, teams, matches);

  return (
    <>
      <div className={styles.groupTableWrapper}>
        <table className={styles.groupTable}>
          <thead>
            <tr>
              <th scope="col">Selección</th>
              <th scope="col" className={styles.tableTextCenter}><abbr title="Partidos jugados">PJ</abbr></th>
              <th scope="col" className={styles.tableTextCenter}><abbr title="Ganados">G</abbr></th>
              <th scope="col" className={styles.tableTextCenter}><abbr title="Empatados">E</abbr></th>
              <th scope="col" className={styles.tableTextCenter}><abbr title="Perdidos">P</abbr></th>
              <th scope="col" className={styles.tableTextCenter}><abbr title="Goles a favor y en contra">GF:GC</abbr></th>
              <th scope="col" className={styles.tableTextCenter}><abbr title="Diferencia de goles">DG</abbr></th>
              <th scope="col" className={styles.tableTextRight}><abbr title="Puntos">PTS</abbr></th>
            </tr>
          </thead>
          <tbody>
            {standings.map((std, idx) => (
              <tr
                key={std.team.id}
                className={idx < 2 ? styles.rowQualifies : idx === 2 ? styles.rowThird : undefined}
              >
                <td className={styles.tableTeamCell}>
                  <span style={{ width: '15px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{idx + 1}</span>
                  <img src={std.team.flag} alt="" className={styles.flag} style={{ width: '22px', height: '15px' }} loading="lazy" />
                  <button
                    type="button"
                    className={styles.teamNameLink}
                    style={{ background: 'none', border: 'none', font: 'inherit', fontWeight: 600, color: 'inherit', padding: 0, textAlign: 'left' }}
                    onClick={() => onSelectTeam(std.team.id)}
                    title={`Ver partidos de ${TEAM_NAMES_ES[std.team.name_en] || std.team.name_en}`}
                  >
                    {TEAM_NAMES_ES[std.team.name_en] || std.team.name_en}
                  </button>
                </td>
                <td className={styles.tableTextCenter}>{std.played}</td>
                <td className={styles.tableTextCenter}>{std.won}</td>
                <td className={styles.tableTextCenter}>{std.drawn}</td>
                <td className={styles.tableTextCenter}>{std.lost}</td>
                <td className={styles.tableTextCenter}>{std.gf}:{std.ga}</td>
                <td className={styles.tableTextCenter} style={{ color: std.gd > 0 ? 'var(--wc-green)' : std.gd < 0 ? 'var(--wc-red)' : 'inherit' }}>
                  {std.gd > 0 ? `+${std.gd}` : std.gd}
                </td>
                <td className={`${styles.tableTextRight} ${styles.tableBold}`}>{std.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showLegend && (
        <div className={styles.tableLegend}>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: 'var(--wc-green)' }} aria-hidden="true"></span>
            Clasifica a dieciseisavos (1º y 2º)
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{ background: '#d97706' }} aria-hidden="true"></span>
            Posible clasificado entre los 8 mejores terceros
          </span>
        </div>
      )}
    </>
  );
}
