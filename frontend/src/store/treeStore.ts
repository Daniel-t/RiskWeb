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
} from '@shared/index';

export interface TreeNodeData {
  label: string;
  nodeType: 'leaf' | 'and' | 'or';
  fairInputs?: FAIRInputs;
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

function toRFNodeType(type: 'leaf' | 'and' | 'or'): string {
  return type === 'leaf' ? 'leaf' : 'gate';
}

function sharedToRFNodes(nodes: AttackTreeNode[]): Node<TreeNodeData>[] {
  return nodes.map((n) => ({
    id: n.id,
    type: toRFNodeType(n.type),
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type,
      fairInputs: n.fairInputs,
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
    type: n.data.nodeType,
    label: n.data.label,
    position: { x: n.position.x, y: n.position.y },
    fairInputs: n.data.fairInputs,
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

  addNode: (type: 'leaf' | 'and' | 'or', position: { x: number; y: number }) => string;
  removeNode: (id: string) => void;
  removeNodeAndDescendants: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<TreeNodeData>) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeType: (id: string, type: 'and' | 'or') => void;
  updateFairInputs: (id: string, fairInputs: FAIRInputs) => void;

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
    const defaultLabels = { leaf: 'New Leaf', and: 'AND Gate', or: 'OR Gate' };
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
        n.id === id
          ? { ...n, type: 'gate', data: { ...n.data, nodeType: type } }
          : n,
      ),
    }));
  },

  updateFairInputs: (id, fairInputs) => {
    get().updateNodeData(id, { fairInputs });
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

    // Leaf nodes cannot be parents (source cannot be a leaf)
    const sourceNode = nodes.find((n) => n.id === source);
    if (sourceNode?.data.nodeType === 'leaf') return false;

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
      const w = node.data.nodeType === 'leaf' ? 160 : 120;
      const h = node.data.nodeType === 'leaf' ? 60 : 50;
      g.setNode(node.id, { width: w, height: h });
    }
    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    set({
      nodes: nodes.map((node) => {
        const pos = g.node(node.id);
        const w = node.data.nodeType === 'leaf' ? 160 : 120;
        const h = node.data.nodeType === 'leaf' ? 60 : 50;
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

    // Single root check
    const nodesWithParent = new Set(edges.map((e) => e.target));
    const roots = nodes.filter((n) => !nodesWithParent.has(n.id));
    if (roots.length === 0) {
      errors.push('Tree must have exactly one root node');
    } else if (roots.length > 1) {
      errors.push('Tree must have exactly one root node');
    }

    // Leaves must have FAIR inputs
    for (const node of nodes) {
      if (node.data.nodeType === 'leaf') {
        if (!node.data.fairInputs) {
          errors.push(`Node '${node.data.label}' is missing FAIR inputs`);
        } else if (node.data.fairInputs.tef && node.data.fairInputs.vulnerability) {
          errors.push(...validateDistribution(node.data.fairInputs.tef, node.data.label, 'TEF'));
          errors.push(
            ...validateDistribution(node.data.fairInputs.vulnerability, node.data.label, 'Vulnerability'),
          );
        } else if (node.data.fairInputs.tef || node.data.fairInputs.vulnerability) {
          errors.push(`Node '${node.data.label}': TEF and Vulnerability must both be defined`);
        } else {
          errors.push(...validateDistribution(node.data.fairInputs.lef, node.data.label, 'LEF'));
        }
      }
    }

    // Gates must have children
    for (const node of nodes) {
      if (node.data.nodeType === 'and' || node.data.nodeType === 'or') {
        const children = edges.filter((e) => e.source === node.id);
        if (children.length === 0) {
          errors.push(`Gate '${node.data.label}' has no children`);
        }
      }
    }

    return errors;
  },

  getNodeValidationStatus: (id) => {
    const { nodes, edges } = get();
    const node = nodes.find((n) => n.id === id);
    if (!node) return 'warning';

    if (node.data.nodeType === 'leaf') {
      if (!node.data.fairInputs) return 'warning';
      if (node.data.fairInputs.tef && node.data.fairInputs.vulnerability) {
        const tefErrors = validateDistribution(node.data.fairInputs.tef, '', 'TEF');
        const vulnErrors = validateDistribution(node.data.fairInputs.vulnerability, '', 'Vulnerability');
        return tefErrors.length === 0 && vulnErrors.length === 0 ? 'valid' : 'warning';
      }
      if (node.data.fairInputs.tef || node.data.fairInputs.vulnerability) return 'warning';
      const lefErrors = validateDistribution(node.data.fairInputs.lef, '', 'LEF');
      return lefErrors.length === 0 ? 'valid' : 'warning';
    }

    // Gate: must have children
    const children = edges.filter((e) => e.source === node.id);
    return children.length > 0 ? 'valid' : 'warning';
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
