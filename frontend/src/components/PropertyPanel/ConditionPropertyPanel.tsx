import type { ChangeEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { Distribution } from '@shared/index';
import type { TreeNodeData } from '../../store/treeStore';
import { useTreeStore } from '../../store/treeStore';
import { DistributionInput } from './DistributionInput';
import { NodeControlsSection } from './NodeControlsSection';

interface ConditionPropertyPanelProps {
  node: Node<TreeNodeData>;
}

export function ConditionPropertyPanel({ node }: ConditionPropertyPanelProps) {
  const { updateNodeLabel, updateProbability } = useTreeStore();
  const probDist = node.data.probability ?? node.data.fairInputs?.vulnerability;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">Condition: {node.data.label}</div>

      <div className="form-group">
        <label className="form-label">Label</label>
        <input
          className="form-input"
          value={node.data.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateNodeLabel(node.id, e.target.value)}
        />
      </div>

      <DistributionInput
        label="Probability (0\u20131)"
        value={probDist}
        onChange={(dist: Distribution) => updateProbability(node.id, dist)}
        max={1}
        defaultDist={{ type: 'constant', params: { value: 1 } }}
      />

      <div
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}
      >
        {probDist ? '' : 'Defaults to P=1 (always true) if not set'}
      </div>

      <div style={{ borderTop: '1px solid var(--border-panel)', paddingTop: 16 }}>
        <NodeControlsSection nodeId={node.id} />
      </div>
    </div>
  );
}
