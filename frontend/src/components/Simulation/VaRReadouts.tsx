import type { ComparisonTab } from '../../store/simulationStore';
import { formatCurrency } from '../../utils/format';

interface VaRReadoutsProps {
  samples: number[];
  baselineSamples?: number[] | null;
  mode: ComparisonTab;
}

function getVaR(sortedSamples: number[], confidence: number): number {
  const idx = Math.floor(confidence * sortedSamples.length);
  return sortedSamples[Math.min(idx, sortedSamples.length - 1)];
}

function getMean(samples: number[]): number {
  return samples.reduce((a, b) => a + b, 0) / samples.length;
}

function getMedian(sortedSamples: number[]): number {
  const mid = Math.floor(sortedSamples.length / 2);
  return sortedSamples.length % 2 === 0
    ? (sortedSamples[mid - 1] + sortedSamples[mid]) / 2
    : sortedSamples[mid];
}

interface MetricRowProps {
  label: string;
  sublabel?: string;
  value: string;
  baselineValue?: string;
  delta?: string;
  deltaColor?: string;
}

function MetricRow({ label, sublabel, value, baselineValue, delta, deltaColor }: MetricRowProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      {baselineValue ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Controlled</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{value}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Baseline</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
              }}
            >
              {baselineValue}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>{value}</div>
      )}
      {sublabel && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {sublabel}
        </div>
      )}
      {delta && (
        <div style={{ fontSize: 11, color: deltaColor ?? 'var(--text-muted)' }}>{delta}</div>
      )}
    </div>
  );
}

export function VaRReadouts({ samples, baselineSamples, mode }: VaRReadoutsProps) {
  const var90 = getVaR(samples, 0.9);
  const var95 = getVaR(samples, 0.95);
  const mean = getMean(samples);
  const median = getMedian(samples);

  const showBaseline = mode === 'compare' && baselineSamples && baselineSamples.length > 0;
  const bVar90 = showBaseline ? getVaR(baselineSamples!, 0.9) : undefined;
  const bVar95 = showBaseline ? getVaR(baselineSamples!, 0.95) : undefined;
  const bMean = showBaseline ? getMean(baselineSamples!) : undefined;
  const bMedian = showBaseline ? getMedian(baselineSamples!) : undefined;

  return (
    <div style={{ minWidth: 160, maxWidth: 200 }}>
      <div
        style={{ fontSize: 12, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}
      >
        Key Risk Metrics
      </div>

      <MetricRow
        label="VaR 90%"
        sublabel="90% confident losses will not exceed this"
        value={formatCurrency(var90)}
        baselineValue={bVar90 !== undefined ? formatCurrency(bVar90) : undefined}
      />
      <MetricRow
        label="VaR 95%"
        value={formatCurrency(var95)}
        baselineValue={bVar95 !== undefined ? formatCurrency(bVar95) : undefined}
      />
      <MetricRow
        label="Expected Loss (Mean)"
        value={formatCurrency(mean)}
        baselineValue={bMean !== undefined ? formatCurrency(bMean) : undefined}
      />
      <MetricRow
        label="Median Loss"
        value={formatCurrency(median)}
        baselineValue={bMedian !== undefined ? formatCurrency(bMedian) : undefined}
      />

      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-panel)',
          paddingTop: 8,
        }}
      >
        {samples.length.toLocaleString()} samples
      </div>
    </div>
  );
}
