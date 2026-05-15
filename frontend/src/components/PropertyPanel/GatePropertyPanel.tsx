import type { ChangeEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { TreeNodeData } from '../../store/treeStore';
import { useTreeStore } from '../../store/treeStore';

interface GatePropertyPanelProps {
  node: Node<TreeNodeData>;
}

export function GatePropertyPanel({ node }: GatePropertyPanelProps) {
  const { updateNodeLabel, updateNodeType, getChildren } = useTreeStore();
  const children = getChildren(node.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">Gate: {node.data.label}</div>

      <div className="form-group">
        <label className="form-label">Label</label>
        <input
          className="form-input"
          value={node.data.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateNodeLabel(node.id, e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <select
          className="form-select"
          value={node.data.nodeType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateNodeType(node.id, e.target.value as 'and' | 'or')
          }
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Children: {children.length}</div>

      <div
        style={{
          fontSize: 13,
          color: children.length > 0 ? 'var(--success)' : 'var(--warning)',
        }}
      >
        {children.length > 0 ? '\u2713 Valid' : '\u26A0 Gate has no children'}
      </div>
    </div>
  );
}
