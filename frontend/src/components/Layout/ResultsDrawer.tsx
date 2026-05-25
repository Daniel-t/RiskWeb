import type { ReactNode } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import {
  useSimulationStore,
  type ComparisonTab,
  type ActiveView,
} from '../../store/simulationStore';

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
  const { resultsDrawerExpanded, toggleResultsDrawer } = useScenarioStore();
  const {
    results,
    hasControls,
    activeTab,
    setActiveTab,
    activeView,
    setActiveView,
  } = useSimulationStore();

  const hasResults = results !== null;
  const chevron = resultsDrawerExpanded ? '\u25BC' : '\u25B2';
  const showSecondary = activeView !== 'sensitivity' && hasControls;

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
