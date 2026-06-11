import type { DragEvent } from 'react';
import type { ControlMeta, ControlCategory } from '@shared/index';
import { useControlStore } from '../../store/controlStore';

const categoryStyles: Record<ControlCategory, { bg: string; text: string; label: string }> = {
  preventive: {
    bg: 'var(--badge-preventive-bg)',
    text: 'var(--badge-preventive-text)',
    label: 'P',
  },
  detective: { bg: 'var(--badge-detective-bg)', text: 'var(--badge-detective-text)', label: 'D' },
  corrective: {
    bg: 'var(--badge-corrective-bg)',
    text: 'var(--badge-corrective-text)',
    label: 'C',
  },
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
    useControlStore.getState().setDraggingControl(true);
  };

  const onDragEnd = () => {
    useControlStore.getState().setDraggingControl(false);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        padding: '8px 10px',
        border: '1px solid var(--border-panel)',
        borderRadius: 6,
        background: 'var(--bg-popover)',
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
      <span
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 500,
        }}
      >
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
