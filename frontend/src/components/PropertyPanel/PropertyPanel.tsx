import { useTreeStore } from '../../store/treeStore';
import { ScenarioInfoPanel } from './ScenarioInfoPanel';
import { LeafPropertyPanel } from './LeafPropertyPanel';
import { GatePropertyPanel } from './GatePropertyPanel';

export function PropertyPanel() {
  const { nodes, selectedNodeId } = useTreeStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return <ScenarioInfoPanel />;
  }

  if (selectedNode.data.nodeType === 'leaf') {
    return <LeafPropertyPanel node={selectedNode} />;
  }

  return <GatePropertyPanel node={selectedNode} />;
}
