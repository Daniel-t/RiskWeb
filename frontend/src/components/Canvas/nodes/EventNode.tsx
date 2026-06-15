import { useCallback, useMemo, useState, type DragEvent } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ControlCategory } from '@shared/index';
import type { TreeNodeData } from '../../../store/treeStore';
import { useControlStore } from '../../../store/controlStore';
import { ValidationBadge } from './ValidationBadge';

const categoryColorMap: Record<ControlCategory, { bg: string; text: string }> = {
  preventive: { bg: 'var(--badge-preventive-bg)', text: 'var(--badge-preventive-text)' },
  detective: { bg: 'var(--badge-detective-bg)', text: 'var(--badge-detective-text)' },
  corrective: { bg: 'var(--badge-corrective-bg)', text: 'var(--badge-corrective-text)' },
};
const mixedColor = { bg: 'var(--badge-mixed-bg)', text: 'var(--badge-mixed-text)' };

function tefSummary(data: TreeNodeData): string {
  const tef = data.tef ?? data.fairInputs?.lef;
  if (!tef) return '';
  if (tef.type === 'constant') return `TEF=${tef.params.value}/yr`;
  if (tef.type === 'pert') return `TEF~${tef.params.mode}/yr`;
  if (tef.type === 'lognormal') return `TEF LN`;
  return '';
}

export function EventNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TreeNodeData;
  const hasTEF = !!(nodeData.tef ?? nodeData.fairInputs?.lef);
  const status = hasTEF ? 'valid' : 'warning';

  const allAssignments = useControlStore((state) => state.assignments);
  const isDraggingControl = useControlStore((state) => state.isDraggingControl);
  const controlCache = useControlStore((state) => state.controlCache);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.nodeId === id),
    [allAssignments, id],
  );
  const enabledAssignments = useMemo(() => assignments.filter((a) => a.enabled), [assignments]);
  const enabledCount = enabledAssignments.length;
  const totalCount = assignments.length;

  const [hoverBadge, setHoverBadge] = useState(false);

  const badgeColor = useMemo(() => {
    if (enabledCount === 0) return mixedColor;
    const categories = new Set<ControlCategory>();
    for (const a of enabledAssignments) {
      const ctrl = controlCache.get(a.controlId);
      if (ctrl) categories.add(ctrl.category);
    }
    if (categories.size === 1) return categoryColorMap[[...categories][0]];
    return mixedColor;
  }, [enabledAssignments, controlCache]);

  const popoverControls = useMemo(() => {
    return assignments.map((a) => {
      const ctrl = controlCache.get(a.controlId);
      let effectiveness = '?';
      if (ctrl) {
        const dist = a.lefReductionOverride ?? ctrl.lefReduction;
        if (dist.type === 'pert') effectiveness = `~${Math.round(dist.params.mode * 100)}%`;
        else if (dist.type === 'constant') effectiveness = `${Math.round(dist.params.value * 100)}%`;
        else if (dist.type === 'lognormal') effectiveness = 'LN';
      }
      return {
        name: ctrl?.name ?? 'Unknown',
        category: ctrl?.category ?? ('preventive' as ControlCategory),
        effectiveness,
        enabled: a.enabled,
      };
    });
  }, [assignments, controlCache]);

  const dropHighlight = isDraggingControl && !selected;

  const handleDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes('application/riskweb-control-id')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      const controlId = e.dataTransfer.getData('application/riskweb-control-id');
      if (!controlId) return;
      const { controlCache: cc, addAssignment } = useControlStore.getState();
      if (!cc.has(controlId)) return;
      e.preventDefault();
      e.stopPropagation();
      addAssignment(controlId, id);
    },
    [id],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        width: 160,
        height: 60,
        background: dropHighlight ? 'var(--bg-drop-highlight)' : 'var(--node-leaf)',
        border: selected
          ? '2px solid var(--primary)'
          : dropHighlight
            ? '2px dashed var(--primary)'
            : '1px solid var(--border-panel)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected
          ? '0 0 0 3px var(--selection-ring)'
          : dropHighlight
            ? '0 0 0 2px var(--drop-ring)'
            : 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'border 0.15s, background 0.15s, box-shadow 0.15s',
        gap: 2,
      }}
    >
      <ValidationBadge status={status} />
      {enabledCount > 0 && (
        <div
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoverBadge(true);
          }}
          onMouseLeave={() => setHoverBadge(false)}
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 6px',
            borderRadius: 9,
            background: badgeColor.bg,
            fontSize: 11,
            fontWeight: 600,
            color: badgeColor.text,
            lineHeight: 1.4,
            cursor: 'default',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1L2 4v4c0 4.4 2.6 7.3 6 8 3.4-.7 6-3.6 6-8V4L8 1z" />
          </svg>
          {enabledCount === totalCount ? totalCount : `${enabledCount}/${totalCount}`}
          {hoverBadge && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 4,
                background: 'var(--bg-popover)',
                border: '1px solid var(--border-panel)',
                borderRadius: 6,
                padding: 8,
                minWidth: 180,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              {popoverControls.map((c, i) => {
                const cc = categoryColorMap[c.category];
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 0',
                      fontSize: 11,
                      color: 'var(--text-popover)',
                      opacity: c.enabled ? 1 : 0.5,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0 4px',
                        borderRadius: 3,
                        background: cc.bg,
                        color: cc.text,
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {c.category.charAt(0).toUpperCase()}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      {c.effectiveness}
                    </span>
                    {!c.enabled && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>OFF</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <span
        title={nodeData.label}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 140,
        }}
      >
        {nodeData.label}
      </span>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {tefSummary(nodeData)}
      </span>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      {/* Event nodes are always leaves — no source handle */}
    </div>
  );
}

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: 'var(--node-handle)',
  border: '2px solid var(--node-handle-border)',
};
