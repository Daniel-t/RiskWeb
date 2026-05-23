import type { Scenario } from '@shared/index';
import { formatCurrency } from '../../utils/format';

interface ComparisonCardsProps {
  scenarios: Scenario[];
  referenceId: string;
  colors: string[];
}

export function ComparisonCards({ scenarios, referenceId, colors }: ComparisonCardsProps) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', overflowX: 'auto' }}>
      {scenarios.map((s, i) => {
        const isRef = s.id === referenceId;
        const r = s.results;
        const controlCount = (s.controlAssignments ?? []).filter((a) => a.enabled).length;

        return (
          <div
            key={s.id}
            style={{
              flex: 1,
              minWidth: 140,
              padding: 12,
              background: 'white',
              border: '1px solid var(--border-panel)',
              borderLeft: isRef ? `3px solid var(--primary)` : '1px solid var(--border-panel)',
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: colors[i], marginBottom: 8 }}>
              {s.name}
              {isRef && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (ref)</span>}
            </div>
            <div style={{ fontSize: 13, fontFamily: 'monospace' }}>
              <div>Mean: {r ? formatCurrency(r.summary.mean) : '--'}</div>
              <div>P90: {r ? formatCurrency(r.summary.percentiles[0.9] ?? 0) : '--'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {controlCount} controls | {r?.iterations.toLocaleString() ?? 0} iter.
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
