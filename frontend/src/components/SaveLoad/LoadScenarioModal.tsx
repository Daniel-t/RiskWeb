import { useEffect, useState, type ChangeEvent } from 'react';
import type { ScenarioMeta } from '@shared/index';
import { listScenarios, deleteScenario } from '../../services/api';

interface LoadScenarioModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (id: string) => void;
  onImportFromClipboard?: () => void;
}

export function LoadScenarioModal({
  open,
  onClose,
  onLoad,
  onImportFromClipboard,
}: LoadScenarioModalProps) {
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listScenarios()
      .then((list) => {
        if (cancelled) return;
        setScenarios(list.sort((a, b) => b.modified.localeCompare(a.modified)));
        setLoading(false);
        setSelectedId(null);
        setSearch('');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load scenarios');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const filtered = scenarios.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete scenario '${name}'?`)) return;
    try {
      await deleteScenario(id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
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
          maxWidth: 560,
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
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Load Scenario</h3>
          <button
            style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <input
          className="form-input"
          placeholder="Search scenarios..."
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {error && (
          <div className="form-error" style={{ marginBottom: 8 }}>
            {error}
          </div>
        )}

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
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Scenario Name
                  </th>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Last Modified
                  </th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      cursor: 'pointer',
                      background: selectedId === s.id ? 'var(--bg-drop-highlight)' : 'transparent',
                      borderBottom: '1px solid var(--border-panel)',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontSize: 14 }}>{s.name}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                      {s.modified.split('T')[0]}
                    </td>
                    <td style={{ padding: '8px 4px' }}>
                      <button
                        style={{
                          fontSize: 14,
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: 4,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id, s.name);
                        }}
                        title="Delete scenario"
                      >
                        &#128465;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {onImportFromClipboard && (
            <button
              className="btn btn-secondary"
              onClick={onImportFromClipboard}
              title="Import scenario JSON from clipboard"
              style={{ marginRight: 'auto' }}
            >
              Import from Clipboard
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!selectedId}
            onClick={() => selectedId && onLoad(selectedId)}
          >
            Load
          </button>
        </div>
      </div>
    </div>
  );
}
