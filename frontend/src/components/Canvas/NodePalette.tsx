import type { DragEvent } from 'react';

const nodeTypes = [
  {
    type: 'leaf',
    label: 'Leaf Node',
    icon: '&#9645;',
    color: 'var(--node-leaf)',
    border: 'var(--border-panel)',
  },
  {
    type: 'and',
    label: 'AND Gate',
    icon: '&amp;',
    color: 'var(--node-and)',
    border: 'var(--node-and-border)',
  },
  {
    type: 'or',
    label: 'OR Gate',
    icon: '|',
    color: 'var(--node-or)',
    border: 'var(--node-or-border)',
  },
] as const;

export function NodePalette() {
  const onDragStart = (e: DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/riskweb-node-type', nodeType);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 12 }}>
        Node Palette
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nodeTypes.map(({ type, label, color, border }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            style={{
              padding: 8,
              border: `1px solid ${border}`,
              borderRadius: 6,
              background: color,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: `1px solid ${border}`,
                borderRadius: type === 'or' ? 6 : type === 'and' ? 2 : 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'var(--bg-popover)',
              }}
            >
              {type === 'and' ? '&' : type === 'or' ? '|' : '\u25A2'}
            </div>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
