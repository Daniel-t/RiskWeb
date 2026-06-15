import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNodeData } from '../../../store/treeStore';
import { ValidationBadge } from './ValidationBadge';

function lmSummary(data: TreeNodeData): string {
  const lm = data.lossMagnitude;
  if (!lm) return 'No LM';
  if (lm.type === 'constant') return `$${lm.params.value.toLocaleString()}`;
  if (lm.type === 'pert') return `$${lm.params.mode.toLocaleString()} (PERT)`;
  if (lm.type === 'lognormal') return `LN(μ=${lm.params.mu})`;
  return '';
}

export function OutcomeNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TreeNodeData;
  const hasLM = !!nodeData.lossMagnitude;
  const status = hasLM ? 'valid' : 'warning';

  return (
    <div
      style={{
        width: 180,
        height: 60,
        background: 'var(--node-leaf, #f1f5f9)',
        border: selected
          ? '3px double var(--primary)'
          : '3px double var(--border-panel)',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? '0 0 0 3px var(--selection-ring)' : 'none',
        position: 'relative',
        cursor: 'pointer',
        gap: 2,
      }}
    >
      <ValidationBadge status={status} />
      <span
        title={nodeData.label}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 160,
        }}
      >
        {nodeData.label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}
      >
        {lmSummary(nodeData)}
      </span>
      {/* Outcome is always root — no target handle */}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: 'var(--node-handle)',
  border: '2px solid var(--node-handle-border)',
};
