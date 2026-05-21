import { useCallback, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Scenario } from '@shared/index';

import { AppShell } from './components/Layout/AppShell';
import { TopBar } from './components/Layout/TopBar';
import { Sidebar } from './components/Layout/Sidebar';
import { ResultsDrawer } from './components/Layout/ResultsDrawer';
import { AttackTreeCanvas } from './components/Canvas/AttackTreeCanvas';
import { LeftSidebarTabs } from './components/Controls/LeftSidebarTabs';
import { ControlFormModal } from './components/Controls/ControlFormModal';
import { CatalogBrowserModal } from './components/Controls/CatalogBrowserModal';
import { PropertyPanel } from './components/PropertyPanel/PropertyPanel';
import { LoadScenarioModal } from './components/SaveLoad/LoadScenarioModal';
import { ResultsSummary } from './components/Simulation/ResultsSummary';
import { ALEHistogram } from './components/Simulation/ALEHistogram';
import { ConfirmationDialog } from './components/shared/ConfirmationDialog';

import { useTreeStore, rfToSharedNodes, rfToSharedEdges } from './store/treeStore';
import { useScenarioStore } from './store/scenarioStore';
import { useSimulationStore } from './store/simulationStore';
import { useControlStore } from './store/controlStore';
import { useSimulation } from './hooks/useSimulation';
import { getScenario, createScenario, updateScenario } from './services/api';
import { exportScenarioToFile, importScenarioFromFile } from './services/fileIO';
import { storage } from './services/storage';

function App() {
  const treeStore = useTreeStore();
  const scenarioStore = useScenarioStore();
  const simulationStore = useSimulationStore();
  const controlStore = useControlStore();
  const simulation = useSimulation();

  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [controlFormOpen, setControlFormOpen] = useState(false);
  const [editControlId, setEditControlId] = useState<string | null>(null);
  const [controlPrefill, setControlPrefill] = useState<
    Partial<Omit<import('@shared/index').Control, 'id' | 'metadata'>> | undefined
  >(undefined);
  const [catalogOpen, setCatalogOpen] = useState(false);
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
      controlAssignments:
        controlStore.assignments.length > 0 ? controlStore.assignments : undefined,
      simulationConfig: scenarioStore.simulationConfig,
      results: simulationStore.results ?? undefined,
    };
  }, [
    treeStore.nodes,
    treeStore.edges,
    scenarioStore,
    simulationStore.results,
    controlStore.assignments,
  ]);

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
          controlStore.resetAssignments();
          setConfirmDialog(null);
        },
      });
    } else {
      treeStore.resetTree();
      scenarioStore.resetScenario();
      simulationStore.clear();
      controlStore.resetAssignments();
    }
  }, [scenarioStore, treeStore, simulationStore, controlStore]);

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
          controlStore.loadAssignments(scenario.controlAssignments ?? []);
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
    [treeStore, scenarioStore, simulationStore, controlStore],
  );

  const handleRun = useCallback(async () => {
    const scenario: Scenario = {
      id: scenarioStore.id ?? crypto.randomUUID(),
      ...buildScenario(),
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };
    // Resolve full Control objects needed by simulation
    const controlIds = new Set((scenario.controlAssignments ?? []).map((a) => a.controlId));
    const controls = await Promise.all(
      [...controlIds].map((id) => controlStore.getControl(id).catch(() => null)),
    );
    const validControls = controls.filter((c): c is NonNullable<typeof c> => c !== null);
    scenarioStore.setResultsDrawerExpanded(true);
    simulation.run(scenario, validControls);
  }, [buildScenario, scenarioStore, simulation, controlStore]);

  const handleExport = useCallback(() => {
    const data = buildScenario();
    const scenario: Scenario = {
      id: scenarioStore.id ?? crypto.randomUUID(),
      ...data,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    };
    exportScenarioToFile(scenario, (id) => controlStore.controlCache.get(id));
  }, [buildScenario, scenarioStore, controlStore]);

  const handleImport = useCallback(async () => {
    const doImport = async () => {
      const result = await importScenarioFromFile();
      if (!result) return;
      const { scenario, importedControls, warnings } = result;

      // Import bundled controls (preserve original IDs for assignment references)
      let added = 0;
      let skipped = 0;
      for (const control of importedControls) {
        try {
          await storage.getControl(control.id);
          skipped++; // Already exists
        } catch {
          await storage.saveControl(control);
          added++;
        }
      }
      if (added > 0) {
        await controlStore.loadControls(); // Refresh control list
      }

      treeStore.loadTree(scenario.nodes, scenario.edges);
      scenarioStore.loadScenario({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        lossMagnitude: scenario.lossMagnitude,
        simulationConfig: scenario.simulationConfig,
      });
      controlStore.loadAssignments(scenario.controlAssignments ?? []);
      if (scenario.results) {
        simulationStore.setResults(scenario.results, []);
      } else {
        simulationStore.clear();
      }

      // Show import summary
      const messages: string[] = [];
      if (added > 0) messages.push(`Imported ${added} control(s)`);
      if (skipped > 0) messages.push(`${skipped} control(s) already existed, skipped`);
      if (warnings.length > 0) messages.push(...warnings);
      if (messages.length > 0) {
        alert('Import notes:\n\n' + messages.join('\n'));
      }
    };

    if (scenarioStore.isDirty) {
      setConfirmDialog({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Discard and import scenario?',
        danger: true,
        onConfirm: () => {
          setConfirmDialog(null);
          doImport();
        },
      });
    } else {
      doImport();
    }
  }, [treeStore, scenarioStore, simulationStore, controlStore]);

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
            onExport={handleExport}
            onImport={handleImport}
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
            <LeftSidebarTabs
              onCreateControl={() => {
                setEditControlId(null);
                setControlPrefill(undefined);
                setControlFormOpen(true);
              }}
              onEditControl={(id) => {
                setEditControlId(id);
                setControlPrefill(undefined);
                setControlFormOpen(true);
              }}
              onOpenCatalog={() => setCatalogOpen(true)}
            />
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
                <ResultsSummary
                  results={simulationStore.results}
                  baselineResults={simulationStore.baselineResults}
                  mode={simulationStore.activeTab}
                />
                {simulationStore.rawALEValues && simulationStore.rawALEValues.length > 0 && (
                  <ALEHistogram
                    rawALEValues={simulationStore.rawALEValues}
                    results={simulationStore.results}
                    baselineRawALE={simulationStore.baselineRawALE}
                    baselineResults={simulationStore.baselineResults}
                    mode={simulationStore.activeTab}
                  />
                )}
              </>
            )}
          </ResultsDrawer>
        }
      />

      <ControlFormModal
        open={controlFormOpen}
        onClose={() => setControlFormOpen(false)}
        editControlId={editControlId}
        prefill={controlPrefill}
      />

      <CatalogBrowserModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onCreateFromCatalog={(prefill) => {
          setCatalogOpen(false);
          setEditControlId(null);
          setControlPrefill(prefill);
          setControlFormOpen(true);
        }}
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
