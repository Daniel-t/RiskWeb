import { useSimulationStore } from '../../store/simulationStore';
import { VaRReadouts } from './VaRReadouts';
import { LossExceedanceCurve } from './LossExceedanceCurve';

export function ExceedancePanel() {
  const { results, baselineResults, activeTab } = useSimulationStore();

  const samples =
    activeTab === 'baseline' ? (baselineResults?.samples ?? []) : (results?.samples ?? []);

  const baselineSamples = baselineResults?.samples ?? null;

  if (samples.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        No sample data available. Re-run simulation to generate exceedance data.
      </div>
    );
  }

  return (
    <>
      <VaRReadouts samples={samples} baselineSamples={baselineSamples} mode={activeTab} />
      <LossExceedanceCurve samples={samples} baselineSamples={baselineSamples} mode={activeTab} />
    </>
  );
}
