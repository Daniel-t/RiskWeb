import { type ChangeEvent, useState } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';

interface TopBarProps {
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  onAutoLayout: () => void;
  onRun: () => void;
  onCancel: () => void;
  canRun: boolean;
}

export function TopBar({
  onNew,
  onSave,
  onLoad,
  onAutoLayout,
  onRun,
  onCancel,
  canRun,
}: TopBarProps) {
  const { name, setName } = useScenarioStore();
  const { isRunning, progress } = useSimulationStore();
  const [editing, setEditing] = useState(false);

  const handleNameBlur = () => setEditing(false);
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setEditing(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bar}>
        <span style={styles.title}>RiskWeb</span>

        <div style={styles.separator} />

        <div style={styles.scenarioName}>
          <span style={styles.scenarioLabel}>Scenario:</span>
          {editing ? (
            <input
              style={styles.nameInput}
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              autoFocus
            />
          ) : (
            <span style={styles.nameDisplay} onClick={() => setEditing(true)}>
              {name}
            </span>
          )}
        </div>

        <div style={styles.spacer} />

        <div style={styles.toolbar}>
          <button className="btn btn-secondary" onClick={onNew}>
            New
          </button>
          <button className="btn btn-secondary" onClick={onSave}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={onLoad}>
            Load
          </button>
          <button className="btn btn-secondary" onClick={onAutoLayout}>
            Auto Layout
          </button>
          {isRunning ? (
            <button className="btn btn-danger" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onRun}
              disabled={!canRun}
              title={canRun ? 'Run simulation' : 'Fix validation errors before running simulation'}
            >
              Run Simulation
            </button>
          )}
        </div>
      </div>

      {isRunning && (
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { flexShrink: 0 },
  bar: {
    height: 48,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    borderBottom: '1px solid var(--border-panel)',
    background: 'var(--bg-app)',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    userSelect: 'none',
  },
  separator: {
    width: 1,
    height: 24,
    background: 'var(--border-panel)',
  },
  scenarioName: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  scenarioLabel: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
  nameInput: {
    height: 28,
    padding: '0 8px',
    border: '1px solid var(--primary)',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    minWidth: 180,
  },
  nameDisplay: {
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid transparent',
  },
  spacer: { flex: 1 },
  toolbar: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    background: '#e2e8f0',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary)',
    transition: 'width 0.2s ease',
  },
};
