import type { DragEvent } from 'react';

const nodeTypes = [
  {
    type: 'outcome',
    label: 'Outcome',
    color: 'var(--node-leaf)',
    border: 'var(--border-panel)',
    icon: '\u25C9',
    radius: 6,
  },
  {
    type: 'event',
    label: 'Threat Event',
    color: 'var(--node-leaf)',
    border: 'var(--border-panel)',
    icon: '\u26A1',
    radius: 4,
  },
  {
    type: 'condition',
    label: 'Condition',
    color: 'var(--node-leaf)',
    border: 'var(--border-panel)',
    icon: '?',
    radius: 4,
  },
  {
    type: 'and',
    label: 'AND Gate',
    color: 'var(--node-and)',
    border: 'var(--node-and-border)',
    icon: '&',
    radius: 2,
  },
  {
    type: 'or',
    label: 'OR Gate',
    color: 'var(--node-or)',
    border: 'var(--node-or-border)',
    icon: '|',
    radius: 6,
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
        {nodeTypes.map(({ type, label, color, border, icon, radius }) => (
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
                borderRadius: radius,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'var(--bg-popover)',
              }}
            >
              {icon}
            </div>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
