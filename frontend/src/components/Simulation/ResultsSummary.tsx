import type { SimulationResult } from '@shared/index';
import type { ComparisonTab } from '../../store/simulationStore';

interface ResultsSummaryProps {
  results: SimulationResult;
  baselineResults?: SimulationResult | null;
  mode: ComparisonTab;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatReduction(baseline: number, controlled: number): string {
  if (baseline === 0) return '-';
  const pct = ((baseline - controlled) / baseline) * 100;
  return `${pct >= 0 ? '-' : '+'}${Math.abs(pct).toFixed(1)}%`;
}

function reductionColor(baseline: number, controlled: number): string {
  if (baseline === 0) return 'var(--text-muted)';
  return controlled <= baseline ? 'var(--success)' : 'var(--danger)';
}

type RowDef = { label: string; getValue: (r: SimulationResult) => number | undefined };

const rowDefs: RowDef[] = [
  { label: 'Mean', getValue: (r) => r.summary.mean },
  { label: 'Std Dev', getValue: (r) => r.summary.stddev },
  { label: 'P10', getValue: (r) => r.summary.percentiles[0.1] },
  { label: 'P50', getValue: (r) => r.summary.percentiles[0.5] },
  { label: 'P90', getValue: (r) => r.summary.percentiles[0.9] },
];

export function ResultsSummary({ results, baselineResults, mode }: ResultsSummaryProps) {
  const active = mode === 'baseline' && baselineResults ? baselineResults : results;

  if (mode === 'compare' && baselineResults) {
    return <ComparisonTable controlled={results} baseline={baselineResults} />;
  }

  return (
    <div style={{ flex: '0 0 40%', minWidth: 200 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        {mode === 'baseline' ? 'Baseline Statistics' : 'Summary Statistics'}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rowDefs.map((row) => {
            const val = row.getValue(active);
            return (
              <tr key={row.label} style={{ borderBottom: '1px solid var(--border-panel)' }}>
                <td
                  style={{
                    padding: '6px 8px',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-muted)',
                  }}
                >
                  {row.label}
                </td>
                <td
                  style={{
                    padding: '6px 8px',
                    fontSize: 16,
                    fontWeight: 600,
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {val != null ? formatCurrency(val) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        {active.iterations.toLocaleString()} iterations in {Math.round(active.duration)}ms
      </div>
    </div>
  );
}

function ComparisonTable({
  controlled,
  baseline,
}: {
  controlled: SimulationResult;
  baseline: SimulationResult;
}) {
  return (
    <div style={{ flex: '0 0 40%', minWidth: 280 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        Comparison
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-panel)' }}>
            <th style={thStyle}>Metric</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Baseline</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Controlled</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Reduction</th>
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((row) => {
            const bVal = row.getValue(baseline) ?? 0;
            const cVal = row.getValue(controlled) ?? 0;
            return (
              <tr key={row.label} style={{ borderBottom: '1px solid var(--border-panel)' }}>
                <td style={labelStyle}>{row.label}</td>
                <td style={valueStyle}>{formatCurrency(bVal)}</td>
                <td style={valueStyle}>{formatCurrency(cVal)}</td>
                <td
                  style={{
                    ...valueStyle,
                    color: reductionColor(bVal, cVal),
                    fontWeight: 600,
                  }}
                >
                  {formatReduction(bVal, cVal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
};

const labelStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-muted)',
};

const valueStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
};
