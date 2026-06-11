import { useEffect, useMemo, useState } from 'react';
import type { ControlCategory } from '@shared/index';
import { useControlStore } from '../../store/controlStore';
import { ControlCard } from './ControlCard';

interface ControlLibraryPanelProps {
  onCreateNew: () => void;
  onEditControl: (id: string) => void;
  onOpenCatalog: () => void;
}

export function ControlLibraryPanel({
  onCreateNew,
  onEditControl,
  onOpenCatalog,
}: ControlLibraryPanelProps) {
  const { controls, isLoading, loadControls } = useControlStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ControlCategory | 'all'>('all');

  useEffect(() => {
    loadControls();
  }, [loadControls]);

  const filtered = useMemo(() => {
    let list = controls;
    if (categoryFilter !== 'all') {
      list = list.filter((c) => c.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.attackTechniques.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [controls, categoryFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<ControlCategory, typeof filtered> = {
      preventive: [],
      detective: [],
      corrective: [],
    };
    for (const c of filtered) {
      groups[c.category].push(c);
    }
    return groups;
  }, [filtered]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div className="section-header">Controls</div>

      <input
        className="form-input"
        placeholder="Search controls..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ fontSize: 12 }}
      />

      <select
        className="form-select"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value as ControlCategory | 'all')}
        style={{ fontSize: 12 }}
      >
        <option value="all">All Categories</option>
        <option value="preventive">Preventive</option>
        <option value="detective">Detective</option>
        <option value="corrective">Corrective</option>
      </select>

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={onCreateNew}>
          + New
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, fontSize: 12 }}
          onClick={onOpenCatalog}
        >
          Catalog
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading...</div>}
        {!isLoading && filtered.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>
            No controls yet. Create one or browse the catalog.
          </div>
        )}
        {(['preventive', 'detective', 'corrective'] as ControlCategory[]).map((cat) =>
          grouped[cat].length > 0 ? (
            <div key={cat}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 4,
                  marginTop: 4,
                }}
              >
                {cat}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {grouped[cat].map((c) => (
                  <ControlCard key={c.id} control={c} onDoubleClick={() => onEditControl(c.id)} />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
