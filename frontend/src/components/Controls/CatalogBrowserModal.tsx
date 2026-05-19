import { useMemo, useState } from 'react';
import type { AttackTechnique, Control, Distribution } from '@shared/index';
import {
  getAttackTechniques,
  getD3fendTechnique,
  getMappings,
} from '../../services/catalog';

interface CatalogBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onCreateFromCatalog: (prefill: Partial<Omit<Control, 'id' | 'metadata'>>) => void;
}

const tactics = [
  'initial-access',
  'execution',
  'impact',
] as const;

export function CatalogBrowserModal({ open, onClose, onCreateFromCatalog }: CatalogBrowserModalProps) {
  const [selectedTactic, setSelectedTactic] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedTech, setSelectedTech] = useState<AttackTechnique | null>(null);

  const techniques = useMemo(() => {
    let list = getAttackTechniques(selectedTactic || undefined);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedTactic, search]);

  const countermeasures = useMemo(() => {
    if (!selectedTech) return [];
    return selectedTech.d3fendCountermeasures
      .map((id) => {
        const def = getD3fendTechnique(id);
        const mappings = getMappings(selectedTech.id, id);
        const suggested = mappings[0]?.suggestedLefReduction;
        return def ? { ...def, suggestedLefReduction: suggested } : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [selectedTech]);

  const handleCreateControl = (defense: { id: string; name: string; category: string; suggestedLefReduction?: Distribution }) => {
    const categoryMap: Record<string, 'preventive' | 'detective' | 'corrective'> = {
      Harden: 'preventive',
      Detect: 'detective',
      Isolate: 'preventive',
      Evict: 'corrective',
    };
    onCreateFromCatalog({
      name: defense.name,
      category: categoryMap[defense.category] ?? 'preventive',
      lefReduction: defense.suggestedLefReduction ?? { type: 'pert', params: { min: 0.2, mode: 0.5, max: 0.8 } },
      attackTechniques: selectedTech ? [selectedTech.id] : [],
      d3fendTechniques: [defense.id],
    });
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 8,
          width: 900,
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>ATT&CK / D3FEND Catalog</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>
            x
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left pane: technique list */}
          <div style={{ width: 360, borderRight: '1px solid var(--border-panel)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                className="form-input"
                placeholder="Search techniques..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: 12 }}
              />
              <select
                className="form-select"
                value={selectedTactic}
                onChange={(e) => setSelectedTactic(e.target.value)}
                style={{ fontSize: 12 }}
              >
                <option value="">All Tactics</option>
                {tactics.map((t) => (
                  <option key={t} value={t}>{t.replace(/-/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
              {techniques.map((tech) => (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTech(tech)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: selectedTech?.id === tech.id ? '#eff6ff' : 'transparent',
                    borderLeft: selectedTech?.id === tech.id ? '3px solid var(--primary)' : '3px solid transparent',
                    marginBottom: 2,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{tech.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {tech.id} - {tech.tactic.replace(/-/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right pane: details */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {!selectedTech ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                Select a technique to view details and D3FEND countermeasures
              </div>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: 14 }}>{selectedTech.name}</h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                  {selectedTech.id} | {selectedTech.tactic.replace(/-/g, ' ')}
                </div>
                {selectedTech.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                    {selectedTech.description}
                  </p>
                )}

                <div className="section-header" style={{ marginBottom: 8 }}>
                  D3FEND Countermeasures ({countermeasures.length})
                </div>

                {countermeasures.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    No mapped countermeasures
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {countermeasures.map((def) => (
                    <div
                      key={def.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{def.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {def.id} | {def.category}
                            {def.suggestedLefReduction?.type === 'pert' && (
                              <> | ~{Math.round((def.suggestedLefReduction.params as { mode: number }).mode * 100)}% LEF reduction</>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => handleCreateControl(def)}
                        >
                          Create Control
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
