import { useState, useMemo } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { ComparisonHeader } from './ComparisonHeader';
import { ComparisonCards } from './ComparisonCards';
import { ComparisonStatsTable } from './ComparisonStatsTable';
import { ComparisonHistogram } from './ComparisonHistogram';
import { ComparisonExceedance } from './ComparisonExceedance';

const COMPARISON_COLORS = ['#64748b', '#3b82f6', '#f59e0b', '#10b981'];

type ChartMode = 'histogram' | 'exceedance';

export function ComparisonView() {
  const { comparisonScenarios, comparisonReferenceId, clearComparison } = useSimulationStore();
  const [chartMode, setChartMode] = useState<ChartMode>('histogram');

  const scenarios = comparisonScenarios ?? [];
  const referenceId = comparisonReferenceId ?? scenarios[0]?.id ?? '';

  // Order: reference first, then others
  const ordered = useMemo(() => {
    const s = comparisonScenarios ?? [];
    const refId = comparisonReferenceId ?? s[0]?.id ?? '';
    const ref = s.find((sc) => sc.id === refId);
    const others = s.filter((sc) => sc.id !== refId);
    return ref ? [ref, ...others] : s;
  }, [comparisonScenarios, comparisonReferenceId]);

  const colors = ordered.map((_, i) => COMPARISON_COLORS[i] ?? '#94a3b8');

  // Warn if iteration counts differ
  const iterationCounts = new Set(ordered.map((s) => s.results?.iterations ?? 0));
  const showIterationWarning = iterationCounts.size > 1;

  if (ordered.length === 0) return null;

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-panel)',
        background: 'var(--bg-app)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ComparisonHeader
        scenarios={ordered}
        referenceId={referenceId}
        onExit={clearComparison}
      />

      {showIterationWarning && (
        <div
          style={{
            background: '#fef3c7',
            padding: '6px 16px',
            fontSize: 12,
            color: '#92400e',
          }}
        >
          Scenarios were simulated with different iteration counts. Results may not be directly
          comparable.
        </div>
      )}

      <ComparisonCards scenarios={ordered} referenceId={referenceId} colors={colors} />

      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '0 16px 16px',
          height: 260,
          overflow: 'hidden',
        }}
      >
        <ComparisonStatsTable
          scenarios={ordered}
          referenceId={referenceId}
          colors={colors}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            {(['histogram', 'exceedance'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                style={{
                  padding: '3px 10px',
                  fontSize: 11,
                  fontWeight: chartMode === m ? 600 : 400,
                  color: chartMode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: chartMode === m ? 'var(--bg-surface)' : 'transparent',
                  border: '1px solid',
                  borderColor: chartMode === m ? 'var(--border-panel)' : 'transparent',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {m === 'histogram' ? 'Histogram' : 'Exceedance'}
              </button>
            ))}
          </div>

          {chartMode === 'histogram' ? (
            <ComparisonHistogram scenarios={ordered} colors={colors} />
          ) : (
            <ComparisonExceedance
              scenarios={ordered}
              colors={colors}
              referenceId={referenceId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
