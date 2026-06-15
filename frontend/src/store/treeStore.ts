import { create } from 'zustand';
import {
  type Node,
  type Edge as RFEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type {
  AttackTreeNode,
  Edge as SharedEdge,
  FAIRInputs,
  Distribution,
  NodeType,
} from '@shared/index';

export type TreeNodeType = NodeType | 'leaf';

export interface TreeNodeData {
  label: string;
  nodeType: TreeNodeType;
  /** @deprecated v1 compat — use tef/probability/lossMagnitude instead */
  fairInputs?: FAIRInputs;
  tef?: Distribution;
  probability?: Distribution;
  lossMagnitude?: Distribution;
  [key: string]: unknown;
}

const DEFAULT_EDGE_STYLE = {
  stroke: '#94a3b8',
  strokeWidth: 2,
};

const SELECTED_EDGE_STYLE = {
  stroke: '#3b82f6',
  strokeWidth: 3,
};

function toRFNodeType(type: string): string {
  switch (type) {
    case 'outcome':
      return 'outcome';
    case 'event':
      return 'event';
    case 'condition':
      return 'condition';
    case 'and':
    case 'or':
      return 'gate';
    case 'leaf':
      return 'leaf';
    default:
      return 'leaf';
  }
}

function sharedToRFNodes(nodes: AttackTreeNode[]): Node<TreeNodeData>[] {
  return nodes.map((n) => ({
    id: n.id,
    type: toRFNodeType(n.type),
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type as TreeNodeType,
      fairInputs: n.fairInputs,
      tef: n.tef,
      probability: n.probability,
      lossMagnitude: n.lossMagnitude,
    },
  }));
}

function sharedToRFEdges(edges: SharedEdge[]): RFEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    type: 'smoothstep',
    style: DEFAULT_EDGE_STYLE,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
  }));
}

export function rfToSharedNodes(nodes: Node<TreeNodeData>[]): AttackTreeNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType as NodeType,
    label: n.data.label,
    position: { x: n.position.x, y: n.position.y },
    ...(n.data.fairInputs && { fairInputs: n.data.fairInputs }),
    ...(n.data.tef && { tef: n.data.tef }),
    ...(n.data.probability && { probability: n.data.probability }),
    ...(n.data.lossMagnitude && { lossMagnitude: n.data.lossMagnitude }),
  }));
}

export function rfToSharedEdges(edges: RFEdge[]): SharedEdge[] {
  return edges.map((e) => ({
    id: e.id,
    sourceId: e.source,
    targetId: e.target,
  }));
}

function validateDistribution(dist: Distribution, label: string, factor: string): string[] {
  const errors: string[] = [];
  if (dist.type === 'pert') {
    const { min, mode, max } = dist.params;
    if (!(min >= 0 && min <= mode && mode <= max && max > min)) {
      errors.push(`Invalid PERT parameters on '${label}' (${factor})`);
    }
  } else if (dist.type === 'lognormal') {
    if (!(dist.params.sigma > 0)) {
      errors.push(`Invalid lognormal parameters on '${label}' (${factor})`);
    }
  } else if (dist.type === 'constant') {
    if (!(dist.params.value >= 0)) {
      errors.push(`Invalid constant value on '${label}' (${factor})`);
    }
  }
  return errors;
}

export interface TreeStore {
  nodes: Node<TreeNodeData>[];
  edges: RFEdge[];
  selectedNodeId: string | null;

  onNodesChange: OnNodesChange<Node<TreeNodeData>>;
  onEdgesChange: OnEdgesChange;
  setSelectedNodeId: (id: string | null) => void;

  addNode: (type: TreeNodeType, position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  removeNodeAndDescendants: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<TreeNodeData>) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeType: (id: string, type: 'and' | 'or') => void;
  updateFairInputs: (id: string, fairInputs: FAIRInputs) => void;
  updateTEF: (id: string, tef: Distribution) => void;
  updateProbability: (id: string, probability: Distribution) => void;
  updateNodeLM: (id: string, lossMagnitude: Distribution) => void;

  canConnect: (connection: Connection) => boolean;
  addEdge: (connection: Connection) => void;
  removeEdge: (id: string) => void;

  resetTree: () => void;
  loadTree: (nodes: AttackTreeNode[], edges: SharedEdge[]) => void;
  autoLayout: () => void;

  getValidationErrors: () => string[];
  getNodeValidationStatus: (id: string) => 'valid' | 'warning';
  getRootNodes: () => Node<TreeNodeData>[];
  getChildren: (id: string) => Node<TreeNodeData>[];
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  onNodesChange: (changes) => {
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  addNode: (type, position) => {
    const id = crypto.randomUUID();
    const defaultLabels: Record<TreeNodeType, string> = {
      outcome: 'Outcome',
      event: 'Threat Event',
      condition: 'Condition',
      and: 'AND Gate',
      or: 'OR Gate',
      leaf: 'New Leaf',
    };
    const node: Node<TreeNodeData> = {
      id,
      type: toRFNodeType(type),
      position,
      data: { label: defaultLabels[type], nodeType: type },
    };
    set((state) => ({ nodes: [...state.nodes, node] }));
    return id;
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  removeNodeAndDescendants: (id) => {
    const { edges } = get();
    const toRemove = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      toRemove.add(current);
      for (const edge of edges) {
        if (edge.source === current && !toRemove.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
    set((state) => ({
      nodes: state.nodes.filter((n) => !toRemove.has(n.id)),
      edges: state.edges.filter((e) => !toRemove.has(e.source) && !toRemove.has(e.target)),
      selectedNodeId: toRemove.has(state.selectedNodeId ?? '') ? null : state.selectedNodeId,
    }));
  },

  duplicateNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    const newId = crypto.randomUUID();
    const newNode: Node<TreeNodeData> = {
      ...node,
      id: newId,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
      data: { ...node.data },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    }));
  },

  updateNodeLabel: (id, label) => {
    get().updateNodeData(id, { label });
  },

  updateNodeType: (id, type) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, type: 'gate', data: { ...n.data, nodeType: type } } : n,
      ),
    }));
  },

  updateFairInputs: (id, fairInputs) => {
    get().updateNodeData(id, { fairInputs });
  },

  updateTEF: (id, tef) => {
    get().updateNodeData(id, { tef });
  },

  updateProbability: (id, probability) => {
    get().updateNodeData(id, { probability });
  },

  updateNodeLM: (id, lossMagnitude) => {
    get().updateNodeData(id, { lossMagnitude });
  },

  canConnect: (connection) => {
    const { nodes, edges } = get();
    const { source, target } = connection;
    if (!source || !target) return false;
    if (source === target) return false;

    // No duplicate edges
    if (edges.some((e) => e.source === source && e.target === target)) return false;

    // No multiple parents (target already has an incoming edge)
    if (edges.some((e) => e.target === target)) return false;

    const sourceNode = nodes.find((n) => n.id === source);
    const targetNode = nodes.find((n) => n.id === target);
    if (!sourceNode || !targetNode) return false;

    // Event and leaf nodes cannot be parents (always leaves at bottom)
    if (sourceNode.data.nodeType === 'event' || sourceNode.data.nodeType === 'leaf') return false;

    // Outcome node cannot be a child (always root)
    if (targetNode.data.nodeType === 'outcome') return false;

    // Condition nodes can have at most 1 child
    if (sourceNode.data.nodeType === 'condition') {
      const existingChildren = edges.filter((e) => e.source === source);
      if (existingChildren.length >= 1) return false;
    }

    // No cycles: check if adding this edge would create a cycle
    const adjacency = new Map<string, string[]>();
    for (const e of edges) {
      if (!adjacency.has(e.source)) adjacency.set(e.source, []);
      adjacency.get(e.source)!.push(e.target);
    }
    if (!adjacency.has(source)) adjacency.set(source, []);
    adjacency.get(source)!.push(target);

    const visited = new Set<string>();
    const stack = new Set<string>();
    function hasCycle(nodeId: string): boolean {
      if (stack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      stack.add(nodeId);
      for (const child of adjacency.get(nodeId) ?? []) {
        if (hasCycle(child)) return true;
      }
      stack.delete(nodeId);
      return false;
    }
    for (const n of nodes) {
      if (hasCycle(n.id)) return false;
    }

    return true;
  },

  addEdge: (connection) => {
    if (!get().canConnect(connection)) return;
    const edge: RFEdge = {
      id: crypto.randomUUID(),
      source: connection.source!,
      target: connection.target!,
      type: 'smoothstep',
      style: DEFAULT_EDGE_STYLE,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
    };
    set((state) => ({ edges: [...state.edges, edge] }));
  },

  removeEdge: (id) => {
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }));
  },

  resetTree: () => set({ nodes: [], edges: [], selectedNodeId: null }),

  loadTree: (sharedNodes, sharedEdges) => {
    set({
      nodes: sharedToRFNodes(sharedNodes),
      edges: sharedToRFEdges(sharedEdges),
      selectedNodeId: null,
    });
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

    for (const node of nodes) {
      let w = 120;
      let h = 50;
      const nt = node.data.nodeType;
      if (nt === 'outcome') {
        w = 180;
        h = 60;
      } else if (nt === 'event' || nt === 'condition' || nt === 'leaf') {
        w = 160;
        h = 60;
      }
      g.setNode(node.id, { width: w, height: h });
    }
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    set({
      nodes: nodes.map((node) => {
        const pos = g.node(node.id);
        const nt = node.data.nodeType;
        let w = 120;
        let h = 50;
        if (nt === 'outcome') {
          w = 180;
          h = 60;
        } else if (nt === 'event' || nt === 'condition' || nt === 'leaf') {
          w = 160;
          h = 60;
        }
        return {
          ...node,
          position: { x: pos.x - w / 2, y: pos.y - h / 2 },
        };
      }),
    });
  },

  getValidationErrors: () => {
    const { nodes, edges } = get();
    const errors: string[] = [];

    if (nodes.length === 0) {
      errors.push('Scenario has no nodes');
      return errors;
    }

    const nodesWithParent = new Set(edges.map((e) => e.target));
    const roots = nodes.filter((n) => !nodesWithParent.has(n.id));
    const isV2 = nodes.some((n) => n.data.nodeType === 'outcome');

    if (isV2) {
      // --- v2 validation ---
      if (roots.length !== 1) {
        errors.push('Tree must have exactly one root node');
      }

      const outcomes = nodes.filter((n) => n.data.nodeType === 'outcome');
      if (outcomes.length !== 1) {
        errors.push('Scenario must have exactly one outcome node');
      }

      const outcome = outcomes[0];
      if (outcome) {
        if (nodesWithParent.has(outcome.id)) {
          errors.push('Outcome node must be the root (no parent)');
        }
        if (!outcome.data.lossMagnitude) {
          errors.push('Outcome node is missing Loss Magnitude distribution');
        } else {
          errors.push(
            ...validateDistribution(outcome.data.lossMagnitude, outcome.data.label, 'LM'),
          );
        }
      }

      for (const node of nodes) {
        const children = edges.filter((e) => e.source === node.id);

        if (node.data.nodeType === 'event') {
          if (children.length > 0) {
            errors.push(`Event node '${node.data.label}' must be a leaf (no children)`);
          }
          const tefDist = node.data.tef ?? node.data.fairInputs?.lef;
          if (!tefDist) {
            errors.push(`Event node '${node.data.label}' is missing TEF distribution`);
          } else {
            errors.push(...validateDistribution(tefDist, node.data.label, 'TEF'));
          }
        } else if (node.data.nodeType === 'condition') {
          if (children.length > 1) {
            errors.push(`Condition node '${node.data.label}' can have at most 1 child`);
          }
          const probDist = node.data.probability ?? node.data.fairInputs?.vulnerability;
          if (probDist) {
            errors.push(...validateDistribution(probDist, node.data.label, 'Probability'));
          }
        } else if (node.data.nodeType === 'and' || node.data.nodeType === 'or') {
          if (children.length < 2) {
            errors.push(`Gate '${node.data.label}' must have at least 2 children`);
          }
        }
      }
    } else {
      // --- v1 validation ---
      if (roots.length !== 1) {
        errors.push('Tree must have exactly one root node');
      }

      for (const node of nodes) {
        if (node.data.nodeType === 'leaf') {
          if (!node.data.fairInputs) {
            errors.push(`Node '${node.data.label}' is missing FAIR inputs`);
          } else if (node.data.fairInputs.tef && node.data.fairInputs.vulnerability) {
            errors.push(
              ...validateDistribution(node.data.fairInputs.tef, node.data.label, 'TEF'),
            );
            errors.push(
              ...validateDistribution(
                node.data.fairInputs.vulnerability,
                node.data.label,
                'Vulnerability',
              ),
            );
          } else if (node.data.fairInputs.tef || node.data.fairInputs.vulnerability) {
            errors.push(
              `Node '${node.data.label}': TEF and Vulnerability must both be defined`,
            );
          } else {
            errors.push(
              ...validateDistribution(node.data.fairInputs.lef, node.data.label, 'LEF'),
            );
          }
        }
      }

      for (const node of nodes) {
        if (node.data.nodeType === 'and' || node.data.nodeType === 'or') {
          const children = edges.filter((e) => e.source === node.id);
          if (children.length === 0) {
            errors.push(`Gate '${node.data.label}' has no children`);
          }
        }
      }
    }

    return errors;
  },

  getNodeValidationStatus: (id) => {
    const { nodes, edges } = get();
    const node = nodes.find((n) => n.id === id);
    if (!node) return 'warning';

    const children = edges.filter((e) => e.source === node.id);

    switch (node.data.nodeType) {
      case 'outcome': {
        if (!node.data.lossMagnitude) return 'warning';
        return validateDistribution(node.data.lossMagnitude, '', 'LM').length === 0
          ? 'valid'
          : 'warning';
      }
      case 'event': {
        const tefDist = node.data.tef ?? node.data.fairInputs?.lef;
        if (!tefDist) return 'warning';
        return validateDistribution(tefDist, '', 'TEF').length === 0 ? 'valid' : 'warning';
      }
      case 'condition': {
        if (children.length > 1) return 'warning';
        const probDist = node.data.probability ?? node.data.fairInputs?.vulnerability;
        if (probDist) {
          return validateDistribution(probDist, '', 'P').length === 0 ? 'valid' : 'warning';
        }
        return 'valid';
      }
      case 'and':
      case 'or':
        return children.length >= 2 ? 'valid' : 'warning';
      case 'leaf':
      default: {
        if (!node.data.fairInputs) return 'warning';
        if (node.data.fairInputs.tef && node.data.fairInputs.vulnerability) {
          const tefErrors = validateDistribution(node.data.fairInputs.tef, '', 'TEF');
          const vulnErrors = validateDistribution(
            node.data.fairInputs.vulnerability,
            '',
            'Vulnerability',
          );
          return tefErrors.length === 0 && vulnErrors.length === 0 ? 'valid' : 'warning';
        }
        if (node.data.fairInputs.tef || node.data.fairInputs.vulnerability) return 'warning';
        const lefErrors = validateDistribution(node.data.fairInputs.lef, '', 'LEF');
        return lefErrors.length === 0 ? 'valid' : 'warning';
      }
    }
  },

  getRootNodes: () => {
    const { nodes, edges } = get();
    const nodesWithParent = new Set(edges.map((e) => e.target));
    return nodes.filter((n) => !nodesWithParent.has(n.id));
  },

  getChildren: (id) => {
    const { nodes, edges } = get();
    const childIds = edges.filter((e) => e.source === id).map((e) => e.target);
    return nodes.filter((n) => childIds.includes(n.id));
  },
}));

export { DEFAULT_EDGE_STYLE, SELECTED_EDGE_STYLE };
