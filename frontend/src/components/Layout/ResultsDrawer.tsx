import type { ReactNode } from 'react';
import { useScenarioStore } from '../../store/scenarioStore';
import { useSimulationStore } from '../../store/simulationStore';

interface ResultsDrawerProps {
  children: ReactNode;
}

export function ResultsDrawer({ children }: ResultsDrawerProps) {
  const { resultsDrawerExpanded, toggleResultsDrawer } = useScenarioStore();
  const { results } = useSimulationStore();

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
      <button
        onClick={toggleResultsDrawer}
        style={{
          width: '100%',
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
