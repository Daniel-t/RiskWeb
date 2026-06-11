import { type ReactNode, useCallback, useRef, useState } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import {
  useSimulationStore,
  type ComparisonTab,
  type ActiveView,
} from '../../store/simulationStore';
import { useTreeStore, rfToSharedNodes } from '../../store/treeStore';
import {
  exportSamplesCsv,
  exportSummaryCsv,
  exportPerNodeCsv,
  exportSensitivityCsv,
} from '../../services/csvExport';

interface ResultsDrawerProps {
  children: ReactNode;
}

const primaryTabs: { key: ActiveView; label: string }[] = [
  { key: 'distribution', label: 'Distribution' },
  { key: 'exceedance', label: 'Exceedance' },
  { key: 'sensitivity', label: 'Sensitivity' },
];

const secondaryTabs: { key: ComparisonTab; label: string }[] = [
  { key: 'controlled', label: 'Controlled' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'compare', label: 'Compare' },
];

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: active ? 600 : 400,
  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
  background: active ? 'var(--bg-surface)' : 'transparent',
  border: '1px solid',
  borderColor: active ? 'var(--border-panel)' : 'transparent',
  borderRadius: 4,
  cursor: 'pointer',
});

export function ResultsDrawer({ children }: ResultsDrawerProps) {
  const { resultsDrawerExpanded, toggleResultsDrawer, name } = useScenarioStore();
  const {
    results,
    baselineResults,
    hasControls,
    activeTab,
    setActiveTab,
    activeView,
    setActiveView,
    sensitivityResult,
  } = useSimulationStore();
  const treeNodes = useTreeStore((s) => s.nodes);

  const hasResults = results !== null;
  const chevron = resultsDrawerExpanded ? '\u25BC' : '\u25B2';
  const showSecondary = activeView !== 'sensitivity' && hasControls;

  const [csvOpen, setCsvOpen] = useState(false);
  const csvRef = useRef<HTMLDivElement>(null);

  const handleCsvExport = useCallback(
    (type: 'samples' | 'summary' | 'nodes' | 'sensitivity') => {
      if (!results) return;
      setCsvOpen(false);
      switch (type) {
        case 'samples':
          exportSamplesCsv(results, name, baselineResults);
          break;
        case 'summary':
          exportSummaryCsv(results, name, baselineResults);
          break;
        case 'nodes':
          exportPerNodeCsv(results, rfToSharedNodes(treeNodes), name);
          break;
        case 'sensitivity':
          if (sensitivityResult) exportSensitivityCsv(sensitivityResult, name);
          break;
      }
    },
    [results, baselineResults, sensitivityResult, name, treeNodes],
  );

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-panel)',
        background: 'var(--bg-app)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={toggleResultsDrawer}
          style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            color: hasResults ? 'var(--text-primary)' : 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 12px',
          }}
        >
          <span>{chevron}</span>
          <span>Results</span>
          {hasResults && results.duration && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              ({Math.round(results.duration)}ms)
            </span>
          )}
        </button>

        {hasResults && resultsDrawerExpanded && (
          <>
            {/* Primary tabs (visualization type) */}
            <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
              {primaryTabs.map((tab) => {
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveView(tab.key)}
                    style={tabStyle(activeView === tab.key)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1 }} />

            {/* CSV export dropdown */}
            <div ref={csvRef} style={{ position: 'relative', marginRight: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ height: 26, fontSize: 11, padding: '0 8px' }}
                onClick={() => setCsvOpen((v) => !v)}
              >
                CSV &#9662;
              </button>
              {csvOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 2,
                    background: 'var(--bg-popover)',
                    border: '1px solid var(--border-panel)',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px var(--bg-overlay)',
                    zIndex: 50,
                    minWidth: 180,
                    padding: 4,
                  }}
                >
                  {[
                    { key: 'samples' as const, label: 'Export Samples CSV', always: true },
                    { key: 'summary' as const, label: 'Export Summary CSV', always: true },
                    { key: 'nodes' as const, label: 'Export Per-Node CSV', always: true },
                    {
                      key: 'sensitivity' as const,
                      label: 'Export Sensitivity CSV',
                      always: false,
                    },
                  ].map((item) => {
                    const enabled = item.always || sensitivityResult !== null;
                    return (
                      <button
                        key={item.key}
                        onClick={() => enabled && handleCsvExport(item.key)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          fontSize: 12,
                          color: enabled ? 'var(--text-primary)' : 'var(--text-muted)',
                          background: 'none',
                          border: 'none',
                          borderRadius: 3,
                          cursor: enabled ? 'pointer' : 'not-allowed',
                          opacity: enabled ? 1 : 0.5,
                        }}
                        onMouseEnter={(e) => {
                          if (enabled)
                            (e.target as HTMLElement).style.background = 'var(--bg-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.background = 'none';
                        }}
                        disabled={!enabled}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Secondary tabs (dataset toggle) */}
            {showSecondary && (
              <div style={{ display: 'flex', gap: 2, marginRight: 12 }}>
                {secondaryTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={tabStyle(activeTab === tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {resultsDrawerExpanded && (
        <div
          style={{
            height: 300,
            overflow: 'auto',
            padding: 16,
            display: 'flex',
            gap: 16,
          }}
        >
          {hasResults ? (
            children
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              Run a simulation to see results here
            </div>
          )}
        </div>
      )}
    </div>
  );
}
