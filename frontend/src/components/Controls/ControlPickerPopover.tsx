import { useEffect, useMemo, useRef, useState } from 'react';
import { useControlStore } from '../../store/controlStore';

interface ControlPickerPopoverProps {
  nodeId: string;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

export function ControlPickerPopover({ nodeId, onClose }: ControlPickerPopoverProps) {
  const { controls, assignments, addAssignment, loadControls } = useControlStore();
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadControls();
  }, [loadControls]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const assignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.nodeId === nodeId).map((a) => a.controlId)),
    [assignments, nodeId],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return controls;
    const q = search.toLowerCase();
    return controls.filter((c) => c.name.toLowerCase().includes(q));
  }, [controls, search]);

  const handleAdd = (controlId: string) => {
    addAssignment(controlId, nodeId);
    onClose();
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        width: 280,
        maxHeight: 300,
        background: 'var(--bg-popover)',
        border: '1px solid var(--border-panel)',
        borderRadius: 8,
        boxShadow: '0 4px 16px var(--bg-overlay)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 8, borderBottom: '1px solid var(--border-panel)' }}>
        <input
          className="form-input"
          placeholder="Search controls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12 }}
          autoFocus
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
        {filtered.length === 0 && (
          <div
            style={{ padding: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}
          >
            No controls available
          </div>
        )}
        {filtered.map((c) => {
          const isAssigned = assignedIds.has(c.id);
          return (
            <div
              key={c.id}
              onClick={() => !isAssigned && handleAdd(c.id)}
              style={{
                padding: '6px 10px',
                borderRadius: 4,
                cursor: isAssigned ? 'default' : 'pointer',
                opacity: isAssigned ? 0.5 : 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
              }}
              onMouseEnter={(e) => {
                if (!isAssigned)
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface-hover)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              {isAssigned ? (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Assigned</span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--primary)' }}>+ Add</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
