import { useState, useCallback } from 'react';
import type { Scenario } from '@shared/index';
import { useSimulationStore } from '../../store/simulationStore';
import { useSimulation } from '../../hooks/useSimulation';
import { useScenarioStore } from '../../store/scenarioStore';
import { useTreeStore, rfToSharedNodes, rfToSharedEdges } from '../../store/treeStore';
import { useControlStore } from '../../store/controlStore';
import { TornadoChart, BidirectionalChart } from './TornadoChart';
import { ShapleyChart } from './ShapleyChart';

type SensitivityTab = 'controlImpact' | 'shapley' | 'inputOAT';

const tabConfig: { key: SensitivityTab; label: string }[] = [
  { key: 'controlImpact', label: 'Control Impact' },
  { key: 'shapley', label: 'Shapley Attribution' },
  { key: 'inputOAT', label: 'Input Sensitivity' },
];

const sensitivityTypeMap = {
  controlImpact: 'controlBidirectional',
  shapley: 'shapley',
  inputOAT: 'oatSweep',
} as const;

export function SensitivityPanel() {
  const {
    sensitivityResult,
    controlImpactResult,
    shapleyResult,
    sensitivityRunning,
    sensitivityProgress,
    results,
  } = useSimulationStore();
  const { runSensitivity } = useSimulation();
  const [tab, setTab] = useState<SensitivityTab>('controlImpact');
  const [topN, setTopN] = useState(10);

  const handleRun = useCallback(async () => {
    const scenarioStore = useScenarioStore.getState();
    const treeStore = useTreeStore.getState();
    const controlStore = useControlStore.getState();

    const scenario: Scenario = {
      id: scenarioStore.id ?? crypto.randomUUID(),
      name: scenarioStore.name,
      description: scenarioStore.description || undefined,
      nodes: rfToSharedNodes(treeStore.nodes),
      edges: rfToSharedEdges(treeStore.edges),
      lossMagnitude: scenarioStore.lossMagnitude,
      controlAssignments:
        controlStore.assignments.length > 0 ? controlStore.assignments : undefined,
      simulationConfig: scenarioStore.simulationConfig,
      metadata: { created: new Date().toISOString(), modified: new Date().toISOString() },
    };

    const controlIds = new Set((scenario.controlAssignments ?? []).map((a) => a.controlId));
    const controls = await Promise.all(
      [...controlIds].map((id) => controlStore.getControl(id).catch(() => null)),
    );
    const validControls = controls.filter((c): c is NonNullable<typeof c> => c !== null);

    runSensitivity(scenario, validControls, sensitivityTypeMap[tab]);
  }, [runSensitivity, tab]);

  if (!results) {
    return <div style={emptyStyle}>Run a simulation first to enable sensitivity analysis.</div>;
  }

  const renderChart = () => {
    switch (tab) {
      case 'controlImpact':
        if (!controlImpactResult) {
          return (
            <div style={emptyStyle}>
              Click &quot;Run&quot; to compute bidirectional control impact analysis.
            </div>
          );
        }
        return (
          <BidirectionalChart
            items={controlImpactResult.items}
            totalCombinedReduction={controlImpactResult.totalCombinedReduction}
            aleNoControls={controlImpactResult.aleNoControls}
            topN={topN}
          />
        );
      case 'shapley':
        if (!shapleyResult) {
          return (
            <div style={emptyStyle}>
              Click &quot;Run&quot; to compute Shapley fair attribution.
            </div>
          );
        }
        return <ShapleyChart result={shapleyResult} topN={topN} />;
      case 'inputOAT':
        if (!sensitivityResult || sensitivityResult.type !== 'oatSweep') {
          return (
            <div style={emptyStyle}>
              Click &quot;Run&quot; to compute input sensitivity (OAT sweep).
            </div>
          );
        }
        return (
          <TornadoChart
            items={sensitivityResult.items}
            baselineALE={sensitivityResult.baselineALE}
            mode="oatSweep"
            topN={topN}
          />
        );
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={handleRun}
          disabled={sensitivityRunning}
          style={{ fontSize: 12 }}
        >
          {sensitivityRunning ? 'Running...' : 'Run'}
        </button>

        <div style={{ display: 'flex', gap: 2 }}>
          {tabConfig.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: tab === key ? 600 : 400,
                color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                background: tab === key ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid',
                borderColor: tab === key ? 'var(--border-panel)' : 'transparent',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <span>Show top:</span>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            style={{
              fontSize: 11,
              padding: '2px 4px',
              borderRadius: 4,
              border: '1px solid var(--border-panel)',
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={0}>All</option>
          </select>
        </div>
      </div>

      {/* Progress bar */}
      {sensitivityRunning && (
        <div style={{ height: 4, background: 'var(--border-panel)', borderRadius: 2 }}>
          <div
            style={{
              height: '100%',
              width: `${sensitivityProgress}%`,
              background: 'var(--primary)',
              borderRadius: 2,
              transition: 'width 0.2s',
            }}
          />
        </div>
      )}

      {/* Chart */}
      {renderChart()}
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-muted)',
  fontSize: 13,
  textAlign: 'center',
  padding: 24,
};
