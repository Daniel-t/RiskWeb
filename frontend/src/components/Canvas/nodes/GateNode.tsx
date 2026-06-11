import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNodeData } from '../../../store/treeStore';
import { ValidationBadge } from './ValidationBadge';

export function GateNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TreeNodeData;
  const isAnd = nodeData.nodeType === 'and';
  const typeLabel = isAnd ? 'AND' : 'OR';
  const fill = isAnd ? 'var(--node-and)' : 'var(--node-or)';
  const borderColor = isAnd ? 'var(--node-and-border)' : 'var(--node-or-border)';
  const typeColor = isAnd ? 'var(--node-and-text)' : 'var(--node-or-text)';
  const borderRadius = isAnd ? 2 : 12;

  return (
    <div
      style={{
        width: 120,
        height: 50,
        background: fill,
        border: selected ? '2px solid var(--primary)' : `1px solid ${borderColor}`,
        borderRadius,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: selected ? '0 0 0 3px var(--selection-ring)' : 'none',
        position: 'relative',
        cursor: 'pointer',
        gap: 1,
      }}
    >
      <ValidationBadge status="valid" />
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 100,
        }}
      >
        {nodeData.label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: typeColor,
        }}
      >
        {typeLabel}
      </span>
      <Handle type="target" position={Position.Top} style={handleStyle} />
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
