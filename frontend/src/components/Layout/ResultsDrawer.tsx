import type { ReactNode } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore, type ComparisonTab } from '../../store/simulationStore';

interface ResultsDrawerProps {
  children: ReactNode;
}

const tabs: { key: ComparisonTab; label: string }[] = [
  { key: 'controlled', label: 'Controlled' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'compare', label: 'Compare' },
];

export function ResultsDrawer({ children }: ResultsDrawerProps) {
  const { resultsDrawerExpanded, toggleResultsDrawer } = useScenarioStore();
  const { results, hasControls, activeTab, setActiveTab } = useSimulationStore();

  const hasResults = results !== null;
  const chevron = resultsDrawerExpanded ? '\u25BC' : '\u25B2';

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
            flex: 1,
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
          }}
        >
          <span>{chevron}</span>
          <span>Results</span>
          {hasResults && results.duration && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              (last run: {Math.round(results.duration)}ms)
            </span>
          )}
        </button>

        {hasControls && resultsDrawerExpanded && (
          <div style={{ display: 'flex', gap: 2, marginRight: 12 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: activeTab === tab.key ? 'var(--bg-surface)' : 'transparent',
                  border: '1px solid',
                  borderColor: activeTab === tab.key ? 'var(--border-panel)' : 'transparent',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
