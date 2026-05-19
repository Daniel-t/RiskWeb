import type { ChangeEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { Distribution } from '@shared/index';
import type { TreeNodeData } from '../../store/treeStore';
import { useTreeStore } from '../../store/treeStore';
import { DistributionInput } from './DistributionInput';
import { NodeControlsSection } from './NodeControlsSection';

interface LeafPropertyPanelProps {
  node: Node<TreeNodeData>;
}

export function LeafPropertyPanel({ node }: LeafPropertyPanelProps) {
  const { updateNodeLabel, updateFairInputs } = useTreeStore();

  const fairInputs = node.data.fairInputs;
  const hasInputs = !!fairInputs;
  const isValid = hasInputs; // simplified — detailed validation in DistributionInput

  const handleLefChange = (lef: Distribution) => {
    updateFairInputs(node.id, { lef });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">Leaf: {node.data.label}</div>

      <div className="form-group">
        <label className="form-label">Label</label>
        <input
          className="form-input"
          value={node.data.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateNodeLabel(node.id, e.target.value)}
        />
      </div>

      <DistributionInput
        label="LEF (events/yr)"
        value={fairInputs?.lef}
        onChange={handleLefChange}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: isValid ? 'var(--success)' : 'var(--warning)',
        }}
      >
        {isValid ? '\u2713 Inputs complete' : '\u26A0 Missing inputs'}
      </div>

      <div style={{ borderTop: '1px solid var(--border-panel)', paddingTop: 16 }}>
        <NodeControlsSection nodeId={node.id} />
      </div>
    </div>
  );
}
