import { useCallback, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Scenario } from '@shared/index';

import { AppShell } from './components/Layout/AppShell';
import { TopBar } from './components/Layout/TopBar';
import { Sidebar } from './components/Layout/Sidebar';
import { ResultsDrawer } from './components/Layout/ResultsDrawer';
import { AttackTreeCanvas } from './components/Canvas/AttackTreeCanvas';
import { NodePalette } from './components/Canvas/NodePalette';
import { PropertyPanel } from './components/PropertyPanel/PropertyPanel';
import { LoadScenarioModal } from './components/SaveLoad/LoadScenarioModal';
import { ResultsSummary } from './components/Simulation/ResultsSummary';
import { ALEHistogram } from './components/Simulation/ALEHistogram';
import { ConfirmationDialog } from './components/shared/ConfirmationDialog';

import { useTreeStore, rfToSharedNodes, rfToSharedEdges } from './store/treeStore';
import { useScenarioStore } from './store/scenarioStore';
import { useSimulationStore } from './store/simulationStore';
import { useSimulation } from './hooks/useSimulation';
import { getScenario, createScenario, updateScenario } from './services/api';

function App() {
  const treeStore = useTreeStore();
  const scenarioStore = useScenarioStore();
  const simulationStore = useSimulationStore();
  const simulation = useSimulation();

  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const validationErrors = treeStore.getValidationErrors();
  const canRun = validationErrors.length === 0 && treeStore.nodes.length > 0;

  const buildScenario = useCallback((): Omit<Scenario, 'id' | 'metadata'> => {
    return {
      name: scenarioStore.name,
      description: scenarioStore.description || undefined,
      nodes: rfToSharedNodes(treeStore.nodes),
      edges: rfToSharedEdges(treeStore.edges),
      lossMagnitude: scenarioStore.lossMagnitude,
      simulationConfig: scenarioStore.simulationConfig,
      results: simulationStore.results ?? undefined,
    };
  }, [treeStore.nodes, treeStore.edges, scenarioStore, simulationStore.results]);

  const handleNew = useCallback(() => {
    if (scenarioStore.isDirty) {
      setConfirmDialog({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Discard and create new scenario?',
        danger: true,
        onConfirm: () => {
          treeStore.resetTree();
          scenarioStore.resetScenario();
          simulationStore.clear();
          setConfirmDialog(null);
        },
      });
    } else {
      treeStore.resetTree();
      scenarioStore.resetScenario();
      simulationStore.clear();
    }
  }, [scenarioStore, treeStore, simulationStore]);

  const handleSave = useCallback(async () => {
    const data = buildScenario();
    try {
      if (scenarioStore.id) {
        await updateScenario(scenarioStore.id, data);
      } else {
        const saved = await createScenario(data);
        scenarioStore.setId(saved.id);
      }
      scenarioStore.markClean();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed');
    }
  }, [buildScenario, scenarioStore]);

  const handleLoad = useCallback(
    async (id: string) => {
      const doLoad = async () => {
        try {
          const scenario = await getScenario(id);
          treeStore.loadTree(scenario.nodes, scenario.edges);
          scenarioStore.loadScenario({
            id: scenario.id,
            name: scenario.name,
            description: scenario.description,
            lossMagnitude: scenario.lossMagnitude,
            simulationConfig: scenario.simulationConfig,
          });
          if (scenario.results) {
            simulationStore.setResults(scenario.results, []);
          } else {
            simulationStore.clear();
          }
          setLoadModalOpen(false);
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Load failed');
        }
      };

      if (scenarioStore.isDirty) {
        setConfirmDialog({
          title: 'Unsaved Changes',
          message: 'You have unsaved changes. Discard and load scenario?',
          danger: true,
          onConfirm: () => {
            setConfirmDialog(null);
            doLoad();
          },
        });
      } else {
        doLoad();
      }
    },
    [treeStore, scenarioStore, simulationStore],
  );

  const handleRun = useCallback(() => {
    const scenario: Scenario = {
      id: scenarioStore.id ?? crypto.randomUUID(),
      ...buildScenario(),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };
    scenarioStore.setResultsDrawerExpanded(true);
    simulation.run(scenario);
  }, [buildScenario, scenarioStore, simulation]);

  const handleAutoLayout = useCallback(() => {
    treeStore.autoLayout();
    scenarioStore.markDirty();
  }, [treeStore, scenarioStore]);

  return (
    <ReactFlowProvider>
      <AppShell
        topBar={
          <TopBar
            onNew={handleNew}
            onSave={handleSave}
            onLoad={() => setLoadModalOpen(true)}
            onAutoLayout={handleAutoLayout}
            onRun={handleRun}
            onCancel={simulation.cancel}
            canRun={canRun}
          />
        }
        leftSidebar={
          <Sidebar
            side="left"
            width={240}
            collapsed={scenarioStore.leftSidebarCollapsed}
            onToggle={scenarioStore.toggleLeftSidebar}
          >
            <NodePalette />
          </Sidebar>
        }
        canvas={<AttackTreeCanvas />}
        rightSidebar={
          <Sidebar
            side="right"
            width={320}
            collapsed={scenarioStore.rightSidebarCollapsed}
            onToggle={scenarioStore.toggleRightSidebar}
          >
            <PropertyPanel />
          </Sidebar>
        }
        resultsDrawer={
          <ResultsDrawer>
            {simulationStore.results && (
              <>
                <ResultsSummary results={simulationStore.results} />
                {simulationStore.rawALEValues && simulationStore.rawALEValues.length > 0 && (
                  <ALEHistogram
                    rawALEValues={simulationStore.rawALEValues}
                    results={simulationStore.results}
                  />
                )}
              </>
            )}
          </ResultsDrawer>
        }
      />

      <LoadScenarioModal
        open={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        onLoad={handleLoad}
      />

      <ConfirmationDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        danger={confirmDialog?.danger}
        confirmLabel="Discard"
        onConfirm={confirmDialog?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />

      {simulation.errors && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'white',
            border: '1px solid var(--danger)',
            borderRadius: 8,
            padding: 16,
            maxWidth: 400,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 150,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>
            Simulation Errors
          </div>
          <ul style={{ fontSize: 13, paddingLeft: 16, margin: 0 }}>
            {simulation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            onClick={() => useSimulationStore.getState().setErrors([])}
          >
            Dismiss
          </button>
        </div>
      )}
    </ReactFlowProvider>
  );
}

export default App;
