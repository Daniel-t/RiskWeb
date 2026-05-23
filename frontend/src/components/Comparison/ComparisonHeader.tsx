import type { Scenario } from '@shared/index';

interface ComparisonHeaderProps {
  scenarios: Scenario[];
  referenceId: string;
  onExit: () => void;
}

export function ComparisonHeader({ scenarios, referenceId, onExit }: ComparisonHeaderProps) {
  const ref = scenarios.find((s) => s.id === referenceId);
  const others = scenarios.filter((s) => s.id !== referenceId);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-panel)',
        background: 'var(--bg-surface)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        Comparing:{' '}
        <strong>{ref?.name ?? 'Unknown'}</strong>
        <span style={{ color: 'var(--text-muted)' }}> (ref)</span>
        {others.map((s) => (
          <span key={s.id}>
            {' '}vs. <strong>{s.name}</strong>
          </span>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={onExit} style={{ fontSize: 12 }}>
        Exit
      </button>
    </div>
  );
}
