import { useEffect, useState, type ChangeEvent } from 'react';
import type { Scenario, ScenarioMeta } from '@shared/index';
import { listScenarios, getScenario } from '../../services/api';
import { formatCurrency } from '../../utils/format';

interface ScenarioComparisonModalProps {
  open: boolean;
  onClose: () => void;
  onCompare: (scenarios: Scenario[], referenceId: string) => void;
}

export function ScenarioComparisonModal({
  open,
  onClose,
  onCompare,
}: ScenarioComparisonModalProps) {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listScenarios()
      .then((list) => {
        if (cancelled) return;
        setScenarios(list);
        setLoading(false);
        setSelectedIds(new Set());
        setReferenceId(null);
        setSearch('');
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const filtered = scenarios.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSelection = (id: string, hasResults: boolean) => {
    if (!hasResults) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      if (referenceId === id) setReferenceId(next.size > 0 ? [...next][0] : null);
    } else {
      if (next.size >= 4) return;
      next.add(id);
      if (!referenceId) setReferenceId(id);
    }
    setSelectedIds(next);
  };

  const handleCompare = async () => {
    const ids = [...selectedIds];
    const loaded = await Promise.all(ids.map((id) => getScenario(id)));
    onCompare(loaded, referenceId ?? ids[0]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-popover)',
          borderRadius: 8,
          padding: 24,
          maxWidth: 640,
          width: '90%',
          boxShadow: '0 8px 32px var(--bg-overlay)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Compare Scenarios</h3>
          <button
            style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Select 2-4 scenarios to compare.
        </div>

        <input
          className="form-input"
          placeholder="Search scenarios..."
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid var(--border-panel)',
            borderRadius: 4,
            marginBottom: 16,
            minHeight: 200,
          }}
        >
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
              No scenarios found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-panel)' }}>
                  <th style={{ padding: '8px 12px', width: 32 }} />
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Scenario
                  </th>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Mean ALE
                  </th>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    P90
                  </th>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Modified
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const hasResults = s.meanALE !== undefined;
                  const isSelected = selectedIds.has(s.id);
                  const isRef = referenceId === s.id;
                  const disabled = !hasResults || (!isSelected && selectedIds.size >= 4);

                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggleSelection(s.id, hasResults)}
                      style={{
                        cursor: hasResults ? 'pointer' : 'not-allowed',
                        background: isSelected ? 'var(--bg-drop-highlight)' : 'transparent',
                        borderBottom: '1px solid var(--border-panel)',
                        opacity: hasResults ? 1 : 0.5,
                      }}
                      title={hasResults ? undefined : 'Run simulation first'}
                    >
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => {}}
                          style={{ cursor: hasResults ? 'pointer' : 'not-allowed' }}
                        />
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          fontSize: 14,
                          fontStyle: hasResults ? 'normal' : 'italic',
                        }}
                      >
                        {s.name}
                        {isRef && (
                          <span style={{ fontSize: 11, color: 'var(--primary)', marginLeft: 8 }}>
                            (ref)
                          </span>
                        )}
                        {hasResults && s.hasSamples === false && (
                          <span
                            title="Missing sample data — exceedance curves unavailable. Re-run simulation and re-save."
                            style={{
                              marginLeft: 6,
                              color: 'var(--warning)',
                              fontSize: 14,
                              cursor: 'help',
                            }}
                          >
                            &#9888;
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'right',
                          fontSize: 13,
                          fontFamily: 'monospace',
                        }}
                      >
                        {hasResults ? formatCurrency(s.meanALE!) : '--'}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          textAlign: 'right',
                          fontSize: 13,
                          fontFamily: 'monospace',
                        }}
                      >
                        {s.p90 !== undefined ? formatCurrency(s.p90) : '--'}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {s.modified.split('T')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Selected: {selectedIds.size} of 4 max
            {referenceId && (
              <span style={{ marginLeft: 8 }}>
                Reference: {scenarios.find((s) => s.id === referenceId)?.name}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedIds.size < 2}
              onClick={handleCompare}
            >
              Compare ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
