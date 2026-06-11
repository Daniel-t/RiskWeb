import type {
  AttackTreeNode,
  Edge,
  Distribution,
  SimulationConfig,
  Control,
  ControlAssignment,
} from '@shared/index';
import { sampleDistribution } from './distributions';

export interface NodeResult {
  lef: number;
  tef?: number;
  vulnerability?: number;
}

/**
 * Topological sort: returns node IDs in evaluation order (leaves first, root last).
 * Throws if the graph contains a cycle.
 */
export function topologicalSort(nodes: AttackTreeNode[], edges: Edge[]): string[] {
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    children.get(e.sourceId)!.push(e.targetId);
    inDegree.set(e.targetId, (inDegree.get(e.targetId) ?? 0) + 1);
  }

  // We want leaves first (nodes with no children have inDegree from parent perspective).
  // Actually for bottom-up: start from nodes with no children (leaves), work up to root.
  // Use reverse: parents depend on children. So a node's "dependencies" are its children.
  // Kahn's algorithm on the child→parent direction.

  const parentOf = new Map<string, string[]>();
  const childCount = new Map<string, number>();

  for (const n of nodes) {
    parentOf.set(n.id, []);
    childCount.set(n.id, 0);
  }

  for (const e of edges) {
    // sourceId = parent, targetId = child
    parentOf.get(e.targetId)!.push(e.sourceId);
    childCount.set(e.sourceId, (childCount.get(e.sourceId) ?? 0) + 1);
  }

  // Start with nodes that have no children (childCount === 0)
  const queue: string[] = [];
  for (const n of nodes) {
    if (childCount.get(n.id) === 0) {
      queue.push(n.id);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    for (const parentId of parentOf.get(nodeId) ?? []) {
      const count = childCount.get(parentId)! - 1;
      childCount.set(parentId, count);
      if (count === 0) {
        queue.push(parentId);
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Tree contains a cycle');
  }

  return sorted;
}

/**
 * Evaluate the entire tree for a single iteration.
 * Returns per-node { lef } values (frequency only).
 * LM is scenario-level and sampled separately.
 */
export function evaluateTree(
  nodes: AttackTreeNode[],
  edges: Edge[],
  sortedOrder: string[],
  rng: () => number,
  nodeAssignments?: Map<string, ControlAssignment[]>,
  controlMap?: Map<string, Control>,
): Map<string, NodeResult> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const results = new Map<string, NodeResult>();

  // Build children lookup (sourceId=parent → targetId=child)
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) childrenOf.set(n.id, []);
  for (const e of edges) {
    childrenOf.get(e.sourceId)!.push(e.targetId);
  }

  for (const nodeId of sortedOrder) {
    const node = nodeMap.get(nodeId)!;

    if (node.type === 'leaf') {
      if (!node.fairInputs) {
        results.set(nodeId, { lef: 0 });
        continue;
      }

      let lef: number;
      let tef: number | undefined;
      let vulnerability: number | undefined;

      // TEF x Vulnerability decomposition
      if (node.fairInputs.tef && node.fairInputs.vulnerability) {
        tef = sampleDistribution(node.fairInputs.tef, rng);
        vulnerability = Math.max(
          0,
          Math.min(1, sampleDistribution(node.fairInputs.vulnerability, rng)),
        );
        lef = tef * vulnerability;
      } else {
        lef = sampleDistribution(node.fairInputs.lef, rng);
      }

      // Apply control LEF reductions (multiplicative stacking)
      const assignments = nodeAssignments?.get(nodeId);
      if (assignments && controlMap) {
        let combinedPassThrough = 1;
        for (const assignment of assignments) {
          if (!assignment.enabled) continue;
          const control = controlMap.get(assignment.controlId);
          if (!control) continue; // orphaned assignment
          const reductionDist = assignment.lefReductionOverride ?? control.lefReduction;
          const reduction = sampleDistribution(reductionDist, rng);
          combinedPassThrough *= 1 - Math.max(0, Math.min(1, reduction));
        }
        combinedPassThrough = Math.max(0, Math.min(1, combinedPassThrough));
        lef *= combinedPassThrough;
      }

      results.set(nodeId, { lef, tef, vulnerability });
    } else {
      // Gate node — aggregate LEF only
      const childIds = childrenOf.get(nodeId) ?? [];
      const childResults = childIds.map((id) => results.get(id)!);

      if (childResults.length === 0) {
        results.set(nodeId, { lef: 0 });
        continue;
      }

      let combinedLEF: number;

      if (node.type === 'and') {
        // AND: LEF = product
        combinedLEF = childResults.reduce((acc, r) => acc * r.lef, 1);
      } else {
        // OR: LEF = 1 - product(1 - LEF_i), with clamping for LEF > 1
        const anyAboveOne = childResults.some((r) => r.lef > 1);
        if (anyAboveOne) {
          const maxLEF = Math.max(...childResults.map((r) => r.lef));
          const clampedProduct = childResults.reduce((acc, r) => acc * (1 - Math.min(r.lef, 1)), 1);
          combinedLEF = (1 - clampedProduct) * maxLEF;
        } else {
          combinedLEF = 1 - childResults.reduce((acc, r) => acc * (1 - r.lef), 1);
        }
      }

      // Clamp NaN/Infinity to 0
      if (!isFinite(combinedLEF)) combinedLEF = 0;

      results.set(nodeId, { lef: combinedLEF });
    }
  }

  return results;
}

/**
 * Apply LM reductions from control assignments (multiplicative stacking).
 * Returns the reduced LM value.
 */
export function applyLmReductions(
  baseLm: number,
  lmAssignments: ControlAssignment[],
  controlMap: Map<string, Control>,
  rng: () => number,
): number {
  if (lmAssignments.length === 0) return baseLm;

  let lmPassThrough = 1;
  for (const a of lmAssignments) {
    if (!a.enabled) continue;
    const ctrl = controlMap.get(a.controlId);
    if (!ctrl || !ctrl.lmReduction) continue;
    const dist = a.lmReductionOverride ?? ctrl.lmReduction;
    const reduction = sampleDistribution(dist, rng);
    lmPassThrough *= 1 - Math.max(0, Math.min(1, reduction));
  }
  lmPassThrough = Math.max(0, Math.min(1, lmPassThrough));
  return baseLm * lmPassThrough;
}

/**
 * Validate a single distribution's parameters.
 */
function validateDistributionParams(dist: Distribution, context: string): string[] {
  const errors: string[] = [];
  if (dist.type === 'pert') {
    const { min, mode, max } = dist.params;
    if (!(min >= 0 && min <= mode && mode <= max && max > min)) {
      errors.push(`Invalid PERT parameters on ${context}`);
    }
  } else if (dist.type === 'lognormal' && !(dist.params.sigma > 0)) {
    errors.push(`Invalid lognormal parameters on ${context}`);
  } else if (dist.type === 'constant' && !(dist.params.value >= 0)) {
    errors.push(`Invalid constant value on ${context}`);
  }
  return errors;
}

/**
 * Validate scenario before simulation.
 * Returns array of all error messages (empty = valid).
 */
export function validateScenario(
  nodes: AttackTreeNode[],
  edges: Edge[],
  config: SimulationConfig,
  lossMagnitude?: Distribution,
): string[] {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Scenario has no nodes');
    return errors;
  }

  // Single root
  const nodesWithParent = new Set(edges.map((e) => e.targetId));
  const roots = nodes.filter((n) => !nodesWithParent.has(n.id));
  if (roots.length !== 1) {
    errors.push('Tree must have exactly one root node');
  }

  // No cycles
  try {
    topologicalSort(nodes, edges);
  } catch {
    errors.push('Tree contains a cycle');
  }

  // Scenario-level LM validation
  if (!lossMagnitude) {
    errors.push('Scenario is missing Loss Magnitude distribution');
  } else {
    errors.push(...validateDistributionParams(lossMagnitude, 'Loss Magnitude'));
  }

  // Leaf validation (LEF or TEF+Vulnerability)
  for (const node of nodes) {
    if (node.type === 'leaf') {
      if (!node.fairInputs) {
        errors.push(`Node '${node.label}' is missing LEF distribution`);
        continue;
      }
      if (node.fairInputs.tef && node.fairInputs.vulnerability) {
        errors.push(...validateDistributionParams(node.fairInputs.tef, `'${node.label}' (TEF)`));
        errors.push(
          ...validateDistributionParams(
            node.fairInputs.vulnerability,
            `'${node.label}' (Vulnerability)`,
          ),
        );
      } else if (node.fairInputs.tef || node.fairInputs.vulnerability) {
        errors.push(
          `Node '${node.label}': TEF and Vulnerability must both be defined or both omitted`,
        );
      } else {
        errors.push(...validateDistributionParams(node.fairInputs.lef, `'${node.label}' (LEF)`));
      }
    }
  }

  // Iterations validation
  if (!(config.iterations > 0 && config.iterations <= 1000000)) {
    errors.push('Iterations must be between 1 and 1,000,000');
  }

  return errors;
}
