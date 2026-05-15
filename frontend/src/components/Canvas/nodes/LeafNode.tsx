import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNodeData } from '../../../store/treeStore';
import { ValidationBadge } from './ValidationBadge';

export function LeafNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TreeNodeData;
  const hasInputs = !!nodeData.fairInputs;
  const status = hasInputs ? 'valid' : 'warning';

  return (
    <div
      style={{
        width: 160,
        height: 60,
        background: 'var(--node-leaf)',
        border: selected ? '2px solid var(--primary)' : '1px solid #e2e8f0',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? '0 0 0 3px rgba(59, 130, 246, 0.3)' : 'none',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <ValidationBadge status={status} />
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          textAlign: 'center',
          padding: '0 8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 140,
        }}
      >
        {nodeData.label}
      </span>
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      {/* Leaf nodes do NOT have a source handle — they cannot be parents */}
    </div>
  );
}

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: '#94a3b8',
  border: '2px solid white',
};
