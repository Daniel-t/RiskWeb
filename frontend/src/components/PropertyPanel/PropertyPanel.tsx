import { useTreeStore } from '../../store/treeStore';
import { ScenarioInfoPanel } from './ScenarioInfoPanel';
import { LeafPropertyPanel } from './LeafPropertyPanel';
import { GatePropertyPanel } from './GatePropertyPanel';
import { OutcomePropertyPanel } from './OutcomePropertyPanel';
import { EventPropertyPanel } from './EventPropertyPanel';
import { ConditionPropertyPanel } from './ConditionPropertyPanel';

export function PropertyPanel() {
  const { nodes, selectedNodeId } = useTreeStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return <ScenarioInfoPanel />;
  }

  switch (selectedNode.data.nodeType) {
    case 'outcome':
      return <OutcomePropertyPanel node={selectedNode} />;
    case 'event':
      return <EventPropertyPanel node={selectedNode} />;
    case 'condition':
      return <ConditionPropertyPanel node={selectedNode} />;
    case 'and':
    case 'or':
      return <GatePropertyPanel node={selectedNode} />;
    case 'leaf':
    default:
      return <LeafPropertyPanel node={selectedNode} />;
  }
}
