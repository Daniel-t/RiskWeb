import type { ChangeEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { Distribution } from '@shared/index';
import type { TreeNodeData } from '../../store/treeStore';
import { useTreeStore } from '../../store/treeStore';
import { DistributionInput } from './DistributionInput';
import { NodeControlsSection } from './NodeControlsSection';

interface EventPropertyPanelProps {
  node: Node<TreeNodeData>;
}

export function EventPropertyPanel({ node }: EventPropertyPanelProps) {
  const { updateNodeLabel, updateTEF } = useTreeStore();
  const tefDist = node.data.tef ?? node.data.fairInputs?.lef;
  const hasTEF = !!tefDist;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-header">Threat Event: {node.data.label}</div>

      <div className="form-group">
        <label className="form-label">Label</label>
        <input
          className="form-input"
          value={node.data.label}
          onChange={(e: ChangeEvent<HTMLInputElement>) => updateNodeLabel(node.id, e.target.value)}
        />
      </div>

      <DistributionInput
        label="TEF (attempts/yr)"
        value={tefDist}
        onChange={(dist: Distribution) => updateTEF(node.id, dist)}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: hasTEF ? 'var(--success)' : 'var(--warning)',
        }}
      >
        {hasTEF ? '\u2713 TEF configured' : '\u26A0 Missing TEF distribution'}
      </div>

      <div style={{ borderTop: '1px solid var(--border-panel)', paddingTop: 16 }}>
        <NodeControlsSection nodeId={node.id} />
      </div>
    </div>
  );
}
