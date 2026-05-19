import type { DragEvent } from 'react';
import type { ControlMeta, ControlCategory } from '@shared/index';

const categoryStyles: Record<ControlCategory, { bg: string; text: string; label: string }> = {
  preventive: { bg: '#dbeafe', text: '#1d4ed8', label: 'P' },
  detective: { bg: '#fef3c7', text: '#92400e', label: 'D' },
  corrective: { bg: '#dcfce7', text: '#166534', label: 'C' },
};

interface ControlCardProps {
  control: ControlMeta;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export function ControlCard({ control, onClick, onDoubleClick }: ControlCardProps) {
  const cat = categoryStyles[control.category];

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('application/riskweb-control-id', control.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        padding: '8px 10px',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
        background: 'white',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 4,
          background: cat.bg,
          color: cat.text,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {cat.label}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
        {control.name}
      </span>
      {control.attackTechniques.length > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
          {control.attackTechniques[0]}
        </span>
      )}
    </div>
  );
}
