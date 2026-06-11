"use client";

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Match, Team, TEAM_NAMES_ES, translateTeamLabel } from '@/lib/utils';
import Modal from './Modal';
import styles from '@/app/page.module.css';

interface SimulatorModalProps {
  match: Match;
  teams: Team[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function SimulatorModal({ match, teams, onClose, onSaved }: SimulatorModalProps) {
  const [homeScore, setHomeScore] = useState(match.home_score);
  const [awayScore, setAwayScore] = useState(match.away_score);
  const [homeTeamId, setHomeTeamId] = useState(match.home_team_id);
  const [awayTeamId, setAwayTeamId] = useState(match.away_team_id);
  const [finished, setFinished] = useState(match.finished === 'TRUE');
  const [timeElapsed, setTimeElapsed] = useState(match.time_elapsed);
  const [saving, setSaving] = useState(false);

  const saveSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: match.id,
          home_score: homeScore,
          away_score: awayScore,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          finished: finished ? 'TRUE' : 'FALSE',
          time_elapsed: timeElapsed
        })
      });

      if (res.ok) {
        await onSaved();
        onClose();
      } else {
        alert('Error al guardar la simulación');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con la API');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="simulator-title">
      <div className={styles.simulatorHeader}>
        <h3 id="simulator-title" className={styles.simulatorTitle}>
          Simular Partido #{match.id}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {match.type === 'group' ? `Fase de Grupos - Grupo ${match.group}` : 'Fase de Eliminación Directa'}
        </p>
      </div>

      <form onSubmit={saveSimulation}>
        {/* Knockout matches allow choosing which teams qualified */}
        {match.type !== 'group' && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="sim-home-team">Equipo Local:</label>
              <select
                id="sim-home-team"
                className={styles.select}
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
              >
                <option value="0">{translateTeamLabel(match.home_team_label)}</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {TEAM_NAMES_ES[t.name_en] || t.name_en}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label htmlFor="sim-away-team">Equipo Visitante:</label>
              <select
                id="sim-away-team"
                className={styles.select}
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
              >
                <option value="0">{translateTeamLabel(match.away_team_label)}</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {TEAM_NAMES_ES[t.name_en] || t.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Score inputs */}
        <div className={styles.scoreInputContainer}>
          <div className={styles.scoreInputGroup}>
            <label htmlFor="sim-home-score" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Goles Local</label>
            <input
              id="sim-home-score"
              type="number"
              min="0"
              max="99"
              className={styles.scoreInput}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '2rem', color: 'var(--text-muted)', marginTop: '1.5rem' }} aria-hidden="true">-</div>
          <div className={styles.scoreInputGroup}>
            <label htmlFor="sim-away-score" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Goles Visitante</label>
            <input
              id="sim-away-score"
              type="number"
              min="0"
              max="99"
              className={styles.scoreInput}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
            />
          </div>
        </div>

        {/* Match status */}
        <div className={styles.formGroup}>
          <label htmlFor="sim-status">Estado del Partido:</label>
          <select
            id="sim-status"
            className={styles.select}
            value={timeElapsed}
            onChange={(e) => {
              const val = e.target.value;
              setTimeElapsed(val);
              if (val === 'finished') {
                setFinished(true);
              } else if (val === 'notstarted') {
                setFinished(false);
              }
            }}
          >
            <option value="notstarted">Programado / No Iniciado</option>
            <option value="15">En Curso - Primer Tiempo (Min 15)</option>
            <option value="halftime">En Curso - Entretiempo (ET)</option>
            <option value="75">En Curso - Segundo Tiempo (Min 75)</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>

        {timeElapsed !== 'notstarted' && timeElapsed !== 'finished' && (
          <div className={styles.checkboxGroup} style={{ marginTop: '1rem' }}>
            <input
              id="sim-finished"
              type="checkbox"
              checked={finished}
              onChange={(e) => setFinished(e.target.checked)}
            />
            <label htmlFor="sim-finished" className={styles.checkboxLabel} style={{ cursor: 'pointer' }}>
              ¿Marcar partido como finalizado?
            </label>
          </div>
        )}

        <div className={styles.simulatorModalActions}>
          <button type="button" onClick={onClose} className={`${styles.btn} ${styles.btnOutline}`}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={`${styles.btn} ${styles.btnAccent}`}>
            <Save size={16} aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
