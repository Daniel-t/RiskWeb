import type { Scenario } from '@shared/index';
import { formatCurrency } from '../../utils/format';

interface ComparisonStatsTableProps {
  scenarios: Scenario[];
  referenceId: string;
  colors: string[];
}

const metrics: { key: string; label: string; getValue: (s: Scenario) => number | undefined }[] = [
  { key: 'mean', label: 'Mean', getValue: (s) => s.results?.summary.mean },
  { key: 'stddev', label: 'Std Dev', getValue: (s) => s.results?.summary.stddev },
  { key: 'p10', label: 'P10', getValue: (s) => s.results?.summary.percentiles[0.1] },
  { key: 'p50', label: 'P50', getValue: (s) => s.results?.summary.percentiles[0.5] },
  { key: 'p90', label: 'P90', getValue: (s) => s.results?.summary.percentiles[0.9] },
];

export function ComparisonStatsTable({
  scenarios,
  referenceId,
  colors,
}: ComparisonStatsTableProps) {
  const refScenario = scenarios.find((s) => s.id === referenceId) ?? scenarios[0];

  return (
    <div style={{ minWidth: 280, maxWidth: 400, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-panel)' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>Metric</th>
            {scenarios.map((s, i) => (
              <th
                key={s.id}
                style={{
                  padding: '6px 8px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: colors[i],
                }}
              >
                {s.name.length > 12 ? s.name.slice(0, 10) + '..' : s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const refVal = m.getValue(refScenario);
            return (
              <tr key={m.key} style={{ borderBottom: '1px solid var(--border-panel)' }}>
                <td style={{ padding: '6px 8px', fontWeight: 500 }}>{m.label}</td>
                {scenarios.map((s) => {
                  const val = m.getValue(s);
                  const isRef = s.id === referenceId;
                  let deltaStr = '';
                  let deltaColor = 'var(--text-muted)';

                  if (!isRef && val !== undefined && refVal !== undefined && refVal !== 0) {
                    const absDelta = val - refVal;
                    const pctDelta = (absDelta / refVal) * 100;
                    deltaStr = `${absDelta >= 0 ? '+' : ''}${formatCurrency(absDelta)} (${pctDelta >= 0 ? '+' : ''}${pctDelta.toFixed(0)}%)`;
                    deltaColor =
                      absDelta < 0
                        ? 'var(--success)'
                        : absDelta > 0
                          ? 'var(--danger)'
                          : 'var(--text-muted)';
                  }

                  return (
                    <td
                      key={s.id}
                      style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}
                    >
                      <div>{val !== undefined ? formatCurrency(val) : '--'}</div>
                      {deltaStr && (
                        <div style={{ fontSize: 10, color: deltaColor }}>{deltaStr}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
