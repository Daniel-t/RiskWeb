import type { ChangeEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { Distribution } from '@shared/index';
import type { TreeNodeData } from '../../store/treeStore';
import { useTreeStore } from '../../store/treeStore';
import { DistributionInput } from './DistributionInput';

interface OutcomePropertyPanelProps {
  node: Node<TreeNodeData>;
}

export function OutcomePropertyPanel({ node }: OutcomePropertyPanelProps) {
  const { updateNodeLabel, updateNodeLM } = useTreeStore();
  const hasLM = !!node.data.lossMagnitude;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">Outcome: {node.data.label}</div>

      <div className="form-group">
        <label className="form-label">Label</label>
        <input
          className="form-input"
          value={node.data.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateNodeLabel(node.id, e.target.value)}
        />
      </div>

      <DistributionInput
        label="Loss Magnitude ($/event)"
        value={node.data.lossMagnitude}
        onChange={(dist: Distribution) => updateNodeLM(node.id, dist)}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: hasLM ? 'var(--success)' : 'var(--warning)',
        }}
      >
        {hasLM ? '\u2713 Loss Magnitude configured' : '\u26A0 Missing Loss Magnitude'}
      </div>
    </div>
  );
}
