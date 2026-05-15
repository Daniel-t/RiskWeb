import type { SimulationResult } from '@shared/index';

interface ResultsSummaryProps {
  results: SimulationResult;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function ResultsSummary({ results }: ResultsSummaryProps) {
  const { summary } = results;

  const rows = [
    { label: 'Mean', value: summary.mean },
    { label: 'Std Dev', value: summary.stddev },
    { label: 'P10', value: summary.percentiles[0.1] },
    { label: 'P50', value: summary.percentiles[0.5] },
    { label: 'P90', value: summary.percentiles[0.9] },
  ];

  return (
    <div style={{ flex: '0 0 40%', minWidth: 200 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        Summary Statistics
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((row) => (
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
                {row.value != null ? formatCurrency(row.value) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
        {results.iterations.toLocaleString()} iterations in {Math.round(results.duration)}ms
      </div>
    </div>
  );
}
