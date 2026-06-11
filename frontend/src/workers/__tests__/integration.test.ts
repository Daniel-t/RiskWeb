import { describe, it, expect } from 'vitest';
import { topologicalSort, evaluateTree } from '../fairEngine';
import { mulberry32 } from '../prng';
import type { AttackTreeNode, Edge, Distribution, Control, ControlAssignment } from '@shared/index';

// ---------- helpers ----------

function leaf(id: string, lef: Distribution): AttackTreeNode {
  return { id, type: 'leaf', label: id, position: { x: 0, y: 0 }, fairInputs: { lef } };
}

function gate(id: string, type: 'and' | 'or'): AttackTreeNode {
  return { id, type, label: id, position: { x: 0, y: 0 } };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, sourceId: source, targetId: target };
}

const constant = (v: number): Distribution => ({ type: 'constant', params: { value: v } });

function makeControl(id: string, lefReduction: number): Control {
  return {
    id,
    name: id,
    category: 'preventive',
    attackTechniques: [],
    d3fendTechniques: [],
    lefReduction: constant(lefReduction),
    metadata: { created: '', modified: '' },
  };
}

function makeAssignment(
  id: string,
  controlId: string,
  nodeId: string,
  opts?: { enabled?: boolean; lefReductionOverride?: Distribution },
): ControlAssignment {
  return {
    id,
    controlId,
    nodeId,
    enabled: opts?.enabled ?? true,
    lefReductionOverride: opts?.lefReductionOverride,
  };
}

/**
 * Compute ALE for a single evaluateTree iteration.
 * ALE = root LEF * loss magnitude (constant).
 */
function computeALE(
  nodes: AttackTreeNode[],
  edges: Edge[],
  lm: number,
  rng: () => number,
  nodeAssignments?: Map<string, ControlAssignment[]>,
  controlMap?: Map<string, Control>,
): number {
  const sorted = topologicalSort(nodes, edges);
  const result = evaluateTree(nodes, edges, sorted, rng, nodeAssignments, controlMap);
  // Root is the last node in sorted order
  const rootId = sorted[sorted.length - 1];
  return result.get(rootId)!.lef * lm;
}

// ---------- shared test fixtures ----------

// Tree: root(OR) -> leafA(constant 0.5), leafB(constant 0.3)
const nodes = [gate('root', 'or'), leaf('A', constant(0.5)), leaf('B', constant(0.3))];
const edges = [edge('root', 'A'), edge('root', 'B')];
const LM = 100_000;

// Baseline OR: 1 - (1-0.5)(1-0.3) = 1 - 0.35 = 0.65
const BASELINE_ALE = 0.65 * LM; // 65000

describe('integration: controls end-to-end', () => {
  it('baseline ALE without controls', () => {
    const ale = computeALE(nodes, edges, LM, mulberry32(1));
    expect(ale).toBeCloseTo(BASELINE_ALE, 5);
  });

  it('single control reduces ALE', () => {
    // 80% reduction on leafA -> leafA LEF = 0.5 * 0.2 = 0.1
    // OR: 1 - (1-0.1)(1-0.3) = 1 - 0.63 = 0.37
    const control = makeControl('c1', 0.8);
    const assignment = makeAssignment('a1', 'c1', 'A');
    const nodeAssignments = new Map([['A', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const ale = computeALE(nodes, edges, LM, mulberry32(1), nodeAssignments, controlMap);
    expect(ale).toBeCloseTo(0.37 * LM, 5);
    expect(ale).toBeLessThan(BASELINE_ALE);
  });

  it('multiple controls stack multiplicatively', () => {
    // Two 50% controls on leafA -> leafA LEF = 0.5 * 0.5 * 0.5 = 0.125
    // OR: 1 - (1-0.125)(1-0.3) = 1 - 0.6125 = 0.3875
    const c1 = makeControl('c1', 0.5);
    const c2 = makeControl('c2', 0.5);
    const assignments = [makeAssignment('a1', 'c1', 'A'), makeAssignment('a2', 'c2', 'A')];
    const nodeAssignments = new Map([['A', assignments]]);
    const controlMap = new Map([
      ['c1', c1],
      ['c2', c2],
    ]);

    const ale = computeALE(nodes, edges, LM, mulberry32(1), nodeAssignments, controlMap);
    expect(ale).toBeCloseTo(0.3875 * LM, 5);
  });

  it('disabled control has no effect on ALE', () => {
    const control = makeControl('c1', 0.8);
    const assignment = makeAssignment('a1', 'c1', 'A', { enabled: false });
    const nodeAssignments = new Map([['A', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const ale = computeALE(nodes, edges, LM, mulberry32(1), nodeAssignments, controlMap);
    expect(ale).toBeCloseTo(BASELINE_ALE, 5);
  });

  it('override changes the reduction magnitude', () => {
    // Base: 50% reduction, override: 90% reduction
    // leafA LEF = 0.5 * (1 - 0.9) = 0.05
    // OR: 1 - (1-0.05)(1-0.3) = 1 - 0.665 = 0.335
    const control = makeControl('c1', 0.5);
    const assignment = makeAssignment('a1', 'c1', 'A', {
      lefReductionOverride: constant(0.9),
    });
    const nodeAssignments = new Map([['A', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const ale = computeALE(nodes, edges, LM, mulberry32(1), nodeAssignments, controlMap);
    expect(ale).toBeCloseTo(0.335 * LM, 5);
  });

  it('statistical test with PERT distributions shows controls reduce mean ALE', () => {
    const pertLef: Distribution = { type: 'pert', params: { min: 0.1, mode: 0.5, max: 0.9 } };
    const pertNodes = [gate('root', 'or'), leaf('A', pertLef), leaf('B', pertLef)];
    const pertEdges = [edge('root', 'A'), edge('root', 'B')];
    const sorted = topologicalSort(pertNodes, pertEdges);

    const control = makeControl('c1', 0.5);
    const assignment = makeAssignment('a1', 'c1', 'A');
    const nodeAssignments = new Map([['A', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const N = 10_000;
    let sumBaseline = 0;
    let sumControlled = 0;

    // Use separate RNGs with same seed offset pattern for fair comparison
    for (let i = 0; i < N; i++) {
      const rng1 = mulberry32(i);
      const rng2 = mulberry32(i);

      const baseResult = evaluateTree(pertNodes, pertEdges, sorted, rng1);
      const ctrlResult = evaluateTree(
        pertNodes,
        pertEdges,
        sorted,
        rng2,
        nodeAssignments,
        controlMap,
      );

      const rootBaseline = baseResult.get('root')!.lef;
      const rootControlled = ctrlResult.get('root')!.lef;

      sumBaseline += rootBaseline * LM;
      sumControlled += rootControlled * LM;
    }

    const meanBaseline = sumBaseline / N;
    const meanControlled = sumControlled / N;

    // Controlled ALE should be meaningfully less than baseline
    expect(meanControlled).toBeLessThan(meanBaseline);
    // With 50% LEF reduction on one of two leaves, expect roughly 15-30% total ALE reduction
    const reductionRatio = 1 - meanControlled / meanBaseline;
    expect(reductionRatio).toBeGreaterThan(0.1);
    expect(reductionRatio).toBeLessThan(0.5);
  });
});
