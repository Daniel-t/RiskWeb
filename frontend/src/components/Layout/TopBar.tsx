import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';

type ThemePref = 'light' | 'system' | 'dark';

function getStoredTheme(): ThemePref {
  const v = localStorage.getItem('riskweb-theme');
  if (v === 'light' || v === 'dark') return v;
  return 'system';
}

function applyTheme(pref: ThemePref): void {
  let resolved = pref;
  if (pref === 'system') {
    resolved = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (resolved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('riskweb-theme', pref);
}

const themeIcons: Record<ThemePref, string> = {
  light: '\u2600',
  system: '\uD83D\uDDA5',
  dark: '\uD83C\uDF19',
};

const themeOrder: ThemePref[] = ['light', 'system', 'dark'];

interface TopBarProps {
  onNew: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onImport: () => void;
  onCopyJson: () => void;
  onAutoLayout: () => void;
  onCompare: () => void;
  onRun: () => void;
  onCancel: () => void;
  canRun: boolean;
}

export function TopBar({
  onNew,
  onSave,
  onLoad,
  onExport,
  onImport,
  onCopyJson,
  onAutoLayout,
  onCompare,
  onRun,
  onCancel,
  canRun,
}: TopBarProps) {
  const { name, setName } = useScenarioStore();
  const { isRunning, progress } = useSimulationStore();
  const [editing, setEditing] = useState(false);
  const [themePref, setThemePref] = useState<ThemePref>(getStoredTheme);

  const cycleTheme = useCallback(() => {
    const next = themeOrder[(themeOrder.indexOf(themePref) + 1) % themeOrder.length];
    setThemePref(next);
    applyTheme(next);
  }, [themePref]);

  useEffect(() => {
    if (themePref !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themePref]);

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
          <button
            className="btn btn-secondary"
            onClick={onExport}
            title="Export scenario to JSON file"
          >
            Export
          </button>
          <button
            className="btn btn-secondary"
            onClick={onImport}
            title="Import scenario from JSON file"
          >
            Import
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCopyJson}
            title="Copy scenario JSON to clipboard"
            style={{ padding: '0 10px' }}
          >
            &#128203;
          </button>
          <button className="btn btn-secondary" onClick={onAutoLayout}>
            Auto Layout
          </button>
          <button className="btn btn-secondary" onClick={onCompare} title="Compare scenarios">
            Compare
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
          <button
            className="btn btn-secondary"
            onClick={cycleTheme}
            title={`Theme: ${themePref}`}
            style={{ padding: '0 10px', fontSize: 16 }}
          >
            {themeIcons[themePref]}
          </button>
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
    background: 'var(--border-panel)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary)',
    transition: 'width 0.2s ease',
  },
};
