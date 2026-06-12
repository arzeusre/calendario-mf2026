"use client";

import { BarChart3 } from 'lucide-react';
import { Match, Team } from '@/lib/utils';
import { GROUP_COLORS, GROUP_TEXT_COLORS } from '@/lib/constants';
import Modal from './Modal';
import GroupStandingsTable from './GroupStandingsTable';
import styles from '@/app/page.module.css';

interface StandingsModalProps {
  group: string;
  teams: Team[];
  matches: Match[];
  onClose: () => void;
  onSelectTeam: (teamId: string) => void;
}

export default function StandingsModal({ group, teams, matches, onClose, onSelectTeam }: StandingsModalProps) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="standings-title"
      style={{ borderLeft: `4px solid ${GROUP_COLORS[group] || '#cbd5e1'}`, maxWidth: '550px' }}
    >
      <div className={styles.simulatorHeader}>
        <h3 id="standings-title" className={styles.simulatorTitle}>
          <BarChart3 size={20} aria-hidden="true" style={{ verticalAlign: 'text-bottom', marginRight: '0.4rem' }} />
          Tabla de Posiciones -{' '}
          <span style={{ color: GROUP_TEXT_COLORS[group] || 'inherit' }}>Grupo {group}</span>
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Fase de Grupos (Calculado en tiempo real)
        </p>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <GroupStandingsTable
          group={group}
          teams={teams}
          matches={matches}
          showLegend
          onSelectTeam={(teamId) => {
            onSelectTeam(teamId);
            onClose();
          }}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`${styles.btn} ${styles.btnOutline}`}
        style={{ marginTop: '1.5rem' }}
      >
        Cerrar tabla
      </button>
    </Modal>
  );
}
