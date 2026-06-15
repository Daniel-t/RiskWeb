import { useEffect, useRef } from 'react';
import type { TreeNodeType } from '../../store/treeStore';

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'canvas' | 'node' | 'edge';
  nodeId?: string;
  edgeId?: string;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onAddNode: (type: TreeNodeType) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

export function ContextMenu({
  menu,
  onClose,
  onAddNode,
  onDeleteNode,
  onDuplicateNode,
  onDeleteEdge,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  const items: { label: string; action: () => void; danger?: boolean }[] = [];

  if (menu.type === 'canvas') {
    items.push(
      { label: 'Add Outcome', action: () => onAddNode('outcome') },
      { label: 'Add Threat Event', action: () => onAddNode('event') },
      { label: 'Add Condition', action: () => onAddNode('condition') },
      { label: 'Add AND Gate', action: () => onAddNode('and') },
      { label: 'Add OR Gate', action: () => onAddNode('or') },
    );
  } else if (menu.type === 'node' && menu.nodeId) {
    items.push(
      { label: 'Duplicate Node', action: () => onDuplicateNode(menu.nodeId!) },
      { label: 'Delete Node', action: () => onDeleteNode(menu.nodeId!), danger: true },
    );
  } else if (menu.type === 'edge' && menu.edgeId) {
    items.push({
      label: 'Delete Connection',
      action: () => onDeleteEdge(menu.edgeId!),
      danger: true,
    });
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: menu.x,
        top: menu.y,
        background: 'var(--bg-popover)',
        borderRadius: 6,
        boxShadow: '0 4px 16px var(--bg-overlay)',
        border: '1px solid var(--border-panel)',
        padding: '4px 0',
        zIndex: 100,
        minWidth: 160,
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.action();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 14px',
            textAlign: 'left',
            fontSize: 14,
            color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'var(--bg-surface-hover)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'none';
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
