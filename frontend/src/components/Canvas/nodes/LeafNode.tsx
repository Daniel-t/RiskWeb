import { useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNodeData } from '../../../store/treeStore';
import { useControlStore } from '../../../store/controlStore';
import { ValidationBadge } from './ValidationBadge';

export function LeafNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TreeNodeData;
  const hasInputs = !!nodeData.fairInputs;
  const status = hasInputs ? 'valid' : 'warning';

  const allAssignments = useControlStore((state) => state.assignments);
  const assignments = useMemo(
    () => allAssignments.filter((a) => a.nodeId === id),
    [allAssignments, id],
  );
  const enabledCount = assignments.filter((a) => a.enabled).length;
  const totalCount = assignments.length;

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
      {totalCount > 0 && (
        <div
          title={`${enabledCount} control${enabledCount !== 1 ? 's' : ''} active`}
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 6px',
            borderRadius: 9,
            background: '#dbeafe',
            fontSize: 11,
            fontWeight: 600,
            color: '#1d4ed8',
            lineHeight: 1.4,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1L2 4v4c0 4.4 2.6 7.3 6 8 3.4-.7 6-3.6 6-8V4L8 1z" />
          </svg>
          {enabledCount === totalCount ? totalCount : `${enabledCount}/${totalCount}`}
        </div>
      )}
      <span
        title={nodeData.label}
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
