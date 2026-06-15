import type {
  AttackTreeNode,
  Edge,
  Distribution,
  SimulationConfig,
  Control,
  ControlAssignment,
} from '@shared/index';
import { sampleDistribution } from './distributions';

export type DomainType = 'frequency' | 'probability';

export interface NodeResult {
  value: number;
  domain: DomainType;
  tef?: number;
  lef?: number;
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
 * Apply control reductions (multiplicative stacking).
 * Reduces a value by sampling each assigned control's reduction distribution.
 */
function applyControlReductions(
  baseValue: number,
  nodeId: string,
  nodeAssignments: Map<string, ControlAssignment[]> | undefined,
  controlMap: Map<string, Control> | undefined,
  rng: () => number,
): number {
  const assignments = nodeAssignments?.get(nodeId);
  if (!assignments || !controlMap) return baseValue;

  let combinedPassThrough = 1;
  for (const assignment of assignments) {
    if (!assignment.enabled) continue;
    const control = controlMap.get(assignment.controlId);
    if (!control) continue;
    const reductionDist = assignment.lefReductionOverride ?? control.lefReduction;
    const reduction = sampleDistribution(reductionDist, rng);
    combinedPassThrough *= 1 - Math.max(0, Math.min(1, reduction));
  }
  combinedPassThrough = Math.max(0, Math.min(1, combinedPassThrough));
  return baseValue * combinedPassThrough;
}

/**
 * Evaluate the entire tree for a single iteration.
 *
 * Domain-aware: each node produces either a frequency or probability value.
 * - event: frequency (TEF, reduced by controls)
 * - condition: probability (0–1). Leaf mode or unary filter (multiplies child by P).
 * - and: all-prob → product. all-freq → min. mixed → min(freqs) × product(probs).
 * - or: all-prob → inclusion-exclusion. all-freq → sum. mixed → invalid (caught by validation).
 * - outcome: sums child frequencies (implicit OR over attack paths). LM sampled by caller.
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
    const childIds = childrenOf.get(nodeId) ?? [];
    const childResults = childIds.map((id) => results.get(id)!);

    if (node.type === 'event') {
      // Event node: frequency source (always a leaf in v2)
      const tefDist = node.tef ?? node.fairInputs?.lef;
      let tef = tefDist ? sampleDistribution(tefDist, rng) : 0;
      tef = applyControlReductions(tef, nodeId, nodeAssignments, controlMap, rng);
      results.set(nodeId, { value: tef, domain: 'frequency', tef, lef: tef });
    } else if (node.type === 'condition') {
      // Condition node: probability (leaf or unary filter)
      const probDist = node.probability ?? node.fairInputs?.vulnerability;
      let p = probDist ? Math.max(0, Math.min(1, sampleDistribution(probDist, rng))) : 1;
      p = applyControlReductions(p, nodeId, nodeAssignments, controlMap, rng);
      p = Math.max(0, Math.min(1, p));

      if (childResults.length === 1) {
        // Filter mode: multiply child's value by P, preserving child's domain
        const child = childResults[0];
        const filtered = child.value * p;
        results.set(nodeId, {
          value: filtered,
          domain: child.domain,
          tef: child.tef,
          lef: child.domain === 'frequency' ? filtered : undefined,
        });
      } else {
        // Leaf mode: pure probability
        results.set(nodeId, { value: p, domain: 'probability' });
      }
    } else if (node.type === 'and') {
      if (childResults.length === 0) {
        results.set(nodeId, { value: 0, domain: 'probability' });
        continue;
      }

      const freqChildren = childResults.filter((r) => r.domain === 'frequency');
      const probChildren = childResults.filter((r) => r.domain === 'probability');

      if (freqChildren.length === 0) {
        // All probability: P = product(P_i)
        const combined = probChildren.reduce((acc, r) => acc * r.value, 1);
        results.set(nodeId, { value: combined, domain: 'probability' });
      } else {
        // Has frequency children: min(freqs) × product(probs)
        const minFreq = Math.min(...freqChildren.map((r) => r.value));
        const probProduct = probChildren.reduce((acc, r) => acc * r.value, 1);
        const combined = minFreq * probProduct;
        results.set(nodeId, { value: combined, domain: 'frequency', lef: combined });
      }
    } else if (node.type === 'or') {
      if (childResults.length === 0) {
        results.set(nodeId, { value: 0, domain: 'probability' });
        continue;
      }

      const freqChildren = childResults.filter((r) => r.domain === 'frequency');
      const probChildren = childResults.filter((r) => r.domain === 'probability');

      if (freqChildren.length > 0 && probChildren.length > 0) {
        // Mixed domain OR: should have been caught by validation. Fallback: sum freqs only.
        const combined = freqChildren.reduce((acc, r) => acc + r.value, 0);
        results.set(nodeId, { value: combined, domain: 'frequency', lef: combined });
      } else if (freqChildren.length > 0) {
        // All frequency: sum
        const combined = freqChildren.reduce((acc, r) => acc + r.value, 0);
        results.set(nodeId, { value: combined, domain: 'frequency', lef: combined });
      } else {
        // All probability: inclusion-exclusion
        const combined = 1 - probChildren.reduce((acc, r) => acc * (1 - r.value), 1);
        results.set(nodeId, { value: combined, domain: 'probability' });
      }
    } else if (node.type === 'outcome') {
      // Outcome node: sum child frequencies. LM is sampled by caller.
      const totalLEF = childResults.reduce(
        (acc, r) => acc + (r.domain === 'frequency' ? r.value : 0),
        0,
      );
      results.set(nodeId, { value: totalLEF, domain: 'frequency', lef: totalLEF });
    } else {
      // v1 compat: old 'leaf' type — treat like event with LEF
      const fairInputs = node.fairInputs;
      let lef = 0;
      let tef: number | undefined;
      if (fairInputs) {
        if (fairInputs.tef && fairInputs.vulnerability) {
          tef = sampleDistribution(fairInputs.tef, rng);
          const vuln = Math.max(0, Math.min(1, sampleDistribution(fairInputs.vulnerability, rng)));
          lef = tef * vuln;
        } else {
          lef = sampleDistribution(fairInputs.lef, rng);
        }
        lef = applyControlReductions(lef, nodeId, nodeAssignments, controlMap, rng);
      }
      results.set(nodeId, { value: lef, domain: 'frequency', tef, lef });
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
 * Supports both v1 (leaf/and/or + scenario LM) and v2 (outcome/event/condition/and/or).
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

  // Build lookups
  const nodesWithParent = new Set(edges.map((e) => e.targetId));
  const roots = nodes.filter((n) => !nodesWithParent.has(n.id));
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) childrenOf.set(n.id, []);
  for (const e of edges) childrenOf.get(e.sourceId)!.push(e.targetId);

  // Detect v2 scenario
  const isV2 = nodes.some((n) => n.type === 'outcome');

  // Single root
  if (roots.length !== 1) {
    errors.push('Tree must have exactly one root node');
  }

  // No cycles
  try {
    topologicalSort(nodes, edges);
  } catch {
    errors.push('Tree contains a cycle');
  }

  if (isV2) {
    // --- v2 validation ---
    const outcomeNodes = nodes.filter((n) => n.type === 'outcome');
    if (outcomeNodes.length !== 1) {
      errors.push('Scenario must have exactly one outcome node');
    }

    const outcome = outcomeNodes[0];
    if (outcome) {
      // Outcome must be root
      if (nodesWithParent.has(outcome.id)) {
        errors.push('Outcome node must be the root (no parent)');
      }

      // Outcome must have LM
      if (!outcome.lossMagnitude) {
        errors.push('Outcome node is missing Loss Magnitude distribution');
      } else {
        errors.push(...validateDistributionParams(outcome.lossMagnitude, `'${outcome.label}' (LM)`));
      }
    }

    // Per-node validation
    for (const node of nodes) {
      const children = childrenOf.get(node.id) ?? [];

      if (node.type === 'event') {
        // Event must be a leaf
        if (children.length > 0) {
          errors.push(`Event node '${node.label}' must be a leaf (no children)`);
        }
        // Event must have TEF
        const tefDist = node.tef ?? node.fairInputs?.lef;
        if (!tefDist) {
          errors.push(`Event node '${node.label}' is missing TEF distribution`);
        } else {
          errors.push(...validateDistributionParams(tefDist, `'${node.label}' (TEF)`));
        }
      } else if (node.type === 'condition') {
        // Condition: 0 or 1 child
        if (children.length > 1) {
          errors.push(`Condition node '${node.label}' can have at most 1 child`);
        }
        // Condition should have probability distribution (default P=1 if missing)
        const probDist = node.probability ?? node.fairInputs?.vulnerability;
        if (probDist) {
          errors.push(...validateDistributionParams(probDist, `'${node.label}' (Probability)`));
        }
      } else if (node.type === 'and' || node.type === 'or') {
        if (children.length < 2) {
          errors.push(`Gate '${node.label}' must have at least 2 children`);
        }
      }
    }
  } else {
    // --- v1 validation (backward compat) ---
    if (!lossMagnitude) {
      errors.push('Scenario is missing Loss Magnitude distribution');
    } else {
      errors.push(...validateDistributionParams(lossMagnitude, 'Loss Magnitude'));
    }

    for (const node of nodes) {
      if (node.type === 'leaf') {
        if (!node.fairInputs) {
          errors.push(`Node '${node.label}' is missing LEF distribution`);
          continue;
        }
        if (node.fairInputs.tef && node.fairInputs.vulnerability) {
          errors.push(
            ...validateDistributionParams(node.fairInputs.tef, `'${node.label}' (TEF)`),
          );
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
          errors.push(
            ...validateDistributionParams(node.fairInputs.lef, `'${node.label}' (LEF)`),
          );
        }
      }
    }
  }

  // Iterations validation (both versions)
  if (!(config.iterations > 0 && config.iterations <= 1000000)) {
    errors.push('Iterations must be between 1 and 1,000,000');
  }

  return errors;
}
