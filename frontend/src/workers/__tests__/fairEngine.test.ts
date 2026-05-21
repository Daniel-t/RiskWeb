import { describe, it, expect } from 'vitest';
import { topologicalSort, evaluateTree, validateScenario, applyLmReductions } from '../fairEngine';
import { mulberry32 } from '../prng';
import type {
  AttackTreeNode,
  Edge,
  SimulationConfig,
  Distribution,
  Control,
  ControlAssignment,
} from '@shared/index';

function makeRng(seed = 12345) {
  return mulberry32(seed);
}

function leaf(id: string, lef: Distribution): AttackTreeNode {
  return { id, type: 'leaf', label: id, position: { x: 0, y: 0 }, fairInputs: { lef } };
}

function gate(id: string, type: 'and' | 'or'): AttackTreeNode {
  return { id, type, label: id, position: { x: 0, y: 0 } };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, sourceId: source, targetId: target };
}

const constantLef = (v: number): Distribution => ({ type: 'constant', params: { value: v } });

// ---------- topologicalSort ----------

describe('topologicalSort', () => {
  it('single node returns [id]', () => {
    const nodes = [gate('root', 'or')];
    expect(topologicalSort(nodes, [])).toEqual(['root']);
  });

  it('linear chain: leaf first, root last', () => {
    const nodes = [gate('root', 'or'), gate('mid', 'or'), leaf('l', constantLef(1))];
    const edges = [edge('root', 'mid'), edge('mid', 'l')];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted.indexOf('l')).toBeLessThan(sorted.indexOf('mid'));
    expect(sorted.indexOf('mid')).toBeLessThan(sorted.indexOf('root'));
  });

  it('fan-out: both children before root', () => {
    const nodes = [gate('root', 'or'), leaf('a', constantLef(1)), leaf('b', constantLef(1))];
    const edges = [edge('root', 'a'), edge('root', 'b')];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('root'));
    expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('root'));
  });

  it('throws on cycle', () => {
    const nodes = [gate('a', 'or'), gate('b', 'or')];
    const edges = [edge('a', 'b'), edge('b', 'a')];
    expect(() => topologicalSort(nodes, edges)).toThrow('Tree contains a cycle');
  });
});

// ---------- evaluateTree ----------

describe('evaluateTree', () => {
  it('single leaf returns sampled LEF', () => {
    const nodes = [leaf('l', constantLef(5))];
    const sorted = topologicalSort(nodes, []);
    const result = evaluateTree(nodes, [], sorted, makeRng());
    expect(result.get('l')!.lef).toBe(5);
  });

  it('leaf with no fairInputs returns lef 0', () => {
    const nodes: AttackTreeNode[] = [
      { id: 'l', type: 'leaf', label: 'l', position: { x: 0, y: 0 } },
    ];
    const sorted = topologicalSort(nodes, []);
    const result = evaluateTree(nodes, [], sorted, makeRng());
    expect(result.get('l')!.lef).toBe(0);
  });

  it('OR gate: 1 - prod(1 - LEF_i)', () => {
    const nodes = [gate('root', 'or'), leaf('a', constantLef(0.3)), leaf('b', constantLef(0.3))];
    const edges = [edge('root', 'a'), edge('root', 'b')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    const expected = 1 - (1 - 0.3) * (1 - 0.3); // 0.51
    expect(result.get('root')!.lef).toBeCloseTo(expected, 10);
  });

  it('AND gate: product of LEFs', () => {
    const nodes = [gate('root', 'and'), leaf('a', constantLef(0.5)), leaf('b', constantLef(0.5))];
    const edges = [edge('root', 'a'), edge('root', 'b')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('root')!.lef).toBeCloseTo(0.25, 10);
  });

  it('control LEF reduction applied to leaf', () => {
    const nodes = [leaf('l', constantLef(10))];
    const sorted = topologicalSort(nodes, []);

    const control: Control = {
      id: 'c1',
      name: 'Test',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constantLef(0.5),
      metadata: { created: '', modified: '' },
    };
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
    };

    const nodeAssignments = new Map([['l', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    expect(result.get('l')!.lef).toBeCloseTo(5, 10);
  });

  it('disabled control is ignored', () => {
    const nodes = [leaf('l', constantLef(10))];
    const sorted = topologicalSort(nodes, []);

    const control: Control = {
      id: 'c1',
      name: 'Test',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constantLef(0.5),
      metadata: { created: '', modified: '' },
    };
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: false,
    };

    const nodeAssignments = new Map([['l', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    expect(result.get('l')!.lef).toBe(10);
  });

  it('multiple controls stack multiplicatively', () => {
    const nodes = [leaf('l', constantLef(10))];
    const sorted = topologicalSort(nodes, []);

    const makeControl = (id: string): Control => ({
      id,
      name: id,
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constantLef(0.5),
      metadata: { created: '', modified: '' },
    });

    const assignments: ControlAssignment[] = [
      { id: 'a1', controlId: 'c1', nodeId: 'l', enabled: true },
      { id: 'a2', controlId: 'c2', nodeId: 'l', enabled: true },
    ];

    const nodeAssignments = new Map([['l', assignments]]);
    const controlMap = new Map([
      ['c1', makeControl('c1')],
      ['c2', makeControl('c2')],
    ]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    // passthrough = 0.5 * 0.5 = 0.25, LEF = 10 * 0.25 = 2.5
    expect(result.get('l')!.lef).toBeCloseTo(2.5, 10);
  });
});

// ---------- validateScenario ----------

describe('validateScenario', () => {
  const validConfig: SimulationConfig = {
    iterations: 10000,
    seed: 42,
    confidenceIntervals: [0.1, 0.5, 0.9],
  };
  const validLM: Distribution = { type: 'pert', params: { min: 1000, mode: 5000, max: 10000 } };

  it('valid scenario returns empty errors', () => {
    const nodes = [gate('root', 'or'), leaf('l', constantLef(5))];
    const edges = [edge('root', 'l')];
    expect(validateScenario(nodes, edges, validConfig, validLM)).toEqual([]);
  });

  it('empty nodes', () => {
    const errors = validateScenario([], [], validConfig, validLM);
    expect(errors).toContain('Scenario has no nodes');
  });

  it('multiple roots', () => {
    const nodes = [gate('r1', 'or'), gate('r2', 'or')];
    const errors = validateScenario(nodes, [], validConfig, validLM);
    expect(errors.some((e) => e.includes('root'))).toBe(true);
  });

  it('cycle detected', () => {
    const nodes = [gate('a', 'or'), gate('b', 'or')];
    const edges = [edge('a', 'b'), edge('b', 'a')];
    const errors = validateScenario(nodes, edges, validConfig, validLM);
    expect(errors.some((e) => e.includes('cycle'))).toBe(true);
  });

  it('missing lossMagnitude', () => {
    const nodes = [leaf('l', constantLef(5))];
    const errors = validateScenario(nodes, [], validConfig, undefined);
    expect(errors.some((e) => e.includes('Loss Magnitude'))).toBe(true);
  });

  it('invalid PERT params (min > max)', () => {
    const nodes = [gate('root', 'or'), leaf('l', constantLef(5))];
    const edges = [edge('root', 'l')];
    const badLM: Distribution = { type: 'pert', params: { min: 100, mode: 50, max: 10 } };
    const errors = validateScenario(nodes, edges, validConfig, badLM);
    expect(errors.some((e) => e.includes('Invalid PERT'))).toBe(true);
  });

  it('iterations = 0', () => {
    const nodes = [leaf('l', constantLef(5))];
    const badConfig = { ...validConfig, iterations: 0 };
    const errors = validateScenario(nodes, [], badConfig, validLM);
    expect(errors.some((e) => e.includes('Iterations'))).toBe(true);
  });

  it('iterations > 1,000,000', () => {
    const nodes = [leaf('l', constantLef(5))];
    const badConfig = { ...validConfig, iterations: 1_000_001 };
    const errors = validateScenario(nodes, [], badConfig, validLM);
    expect(errors.some((e) => e.includes('Iterations'))).toBe(true);
  });

  it('leaf missing fairInputs', () => {
    const nodes: AttackTreeNode[] = [
      { id: 'l', type: 'leaf', label: 'Unnamed', position: { x: 0, y: 0 } },
    ];
    const errors = validateScenario(nodes, [], validConfig, validLM);
    expect(errors.some((e) => e.includes('missing LEF'))).toBe(true);
  });
});

// ---------- control overrides ----------

describe('evaluateTree - control overrides', () => {
  it('lefReductionOverride takes precedence over control base value', () => {
    const nodes = [leaf('l', constantLef(10))];
    const sorted = topologicalSort(nodes, []);

    const control: Control = {
      id: 'c1',
      name: 'Test',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constantLef(0.5), // base: 50% reduction
      metadata: { created: '', modified: '' },
    };
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
      lefReductionOverride: constantLef(0.8), // override: 80% reduction
    };

    const nodeAssignments = new Map([['l', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    // Should use override (0.8), not base (0.5): 10 * (1 - 0.8) = 2.0
    expect(result.get('l')!.lef).toBeCloseTo(2.0, 10);
  });
});

// ---------- orphaned assignments ----------

describe('evaluateTree - orphaned assignments', () => {
  it('assignment referencing missing control is silently skipped', () => {
    const nodes = [leaf('l', constantLef(10))];
    const sorted = topologicalSort(nodes, []);

    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'missing-control',
      nodeId: 'l',
      enabled: true,
    };

    const nodeAssignments = new Map([['l', [assignment]]]);
    const controlMap = new Map<string, Control>(); // empty — no controls

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    // Orphaned assignment skipped, LEF unchanged
    expect(result.get('l')!.lef).toBe(10);
  });
});

// ---------- reproducibility ----------

describe('evaluateTree - reproducibility', () => {
  const pertLef: Distribution = { type: 'pert', params: { min: 1, mode: 5, max: 20 } };

  it('same seed produces identical results', () => {
    const nodes = [gate('root', 'or'), leaf('a', pertLef), leaf('b', pertLef)];
    const edges = [edge('root', 'a'), edge('root', 'b')];
    const sorted = topologicalSort(nodes, edges);

    const result1 = evaluateTree(nodes, edges, sorted, makeRng(42));
    const result2 = evaluateTree(nodes, edges, sorted, makeRng(42));

    expect(result1.get('a')!.lef).toBe(result2.get('a')!.lef);
    expect(result1.get('b')!.lef).toBe(result2.get('b')!.lef);
    expect(result1.get('root')!.lef).toBe(result2.get('root')!.lef);
  });

  it('different seeds produce different results', () => {
    const nodes = [leaf('l', pertLef)];
    const sorted = topologicalSort(nodes, []);

    const result1 = evaluateTree(nodes, [], sorted, makeRng(1));
    const result2 = evaluateTree(nodes, [], sorted, makeRng(99999));

    expect(result1.get('l')!.lef).not.toBe(result2.get('l')!.lef);
  });
});

// ---------- applyLmReductions ----------

describe('applyLmReductions', () => {
  const makeControl = (id: string, lmReduction?: Distribution): Control => ({
    id,
    name: id,
    category: 'preventive',
    attackTechniques: [],
    d3fendTechniques: [],
    lefReduction: constantLef(0.5),
    lmReduction,
    metadata: { created: '', modified: '' },
  });

  it('single control with LM reduction reduces scenario LM', () => {
    const ctrl = makeControl('c1', constantLef(0.4));
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
    };
    const controlMap = new Map([['c1', ctrl]]);
    const result = applyLmReductions(10000, [assignment], controlMap, makeRng());
    // LM = 10000 * (1 - 0.4) = 6000
    expect(result).toBeCloseTo(6000, 5);
  });

  it('two controls with LM reduction stack multiplicatively', () => {
    const ctrl1 = makeControl('c1', constantLef(0.3));
    const ctrl2 = makeControl('c2', constantLef(0.5));
    const assignments: ControlAssignment[] = [
      { id: 'a1', controlId: 'c1', nodeId: 'l', enabled: true },
      { id: 'a2', controlId: 'c2', nodeId: 'l', enabled: true },
    ];
    const controlMap = new Map([
      ['c1', ctrl1],
      ['c2', ctrl2],
    ]);
    const result = applyLmReductions(10000, assignments, controlMap, makeRng());
    // passthrough = (1-0.3) * (1-0.5) = 0.7 * 0.5 = 0.35
    // LM = 10000 * 0.35 = 3500
    expect(result).toBeCloseTo(3500, 5);
  });

  it('control with only LEF reduction does not affect LM', () => {
    const ctrl = makeControl('c1'); // no lmReduction
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
    };
    const controlMap = new Map([['c1', ctrl]]);
    const result = applyLmReductions(10000, [assignment], controlMap, makeRng());
    expect(result).toBe(10000);
  });

  it('LM override takes precedence over base value', () => {
    const ctrl = makeControl('c1', constantLef(0.3)); // base: 30%
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
      lmReductionOverride: constantLef(0.7), // override: 70%
    };
    const controlMap = new Map([['c1', ctrl]]);
    const result = applyLmReductions(10000, [assignment], controlMap, makeRng());
    // Should use override (0.7): 10000 * (1 - 0.7) = 3000
    expect(result).toBeCloseTo(3000, 5);
  });

  it('disabled assignment LM reduction is skipped', () => {
    const ctrl = makeControl('c1', constantLef(0.5));
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: false,
    };
    const controlMap = new Map([['c1', ctrl]]);
    const result = applyLmReductions(10000, [assignment], controlMap, makeRng());
    expect(result).toBe(10000);
  });

  it('empty assignments returns base LM unchanged', () => {
    const controlMap = new Map<string, Control>();
    const result = applyLmReductions(10000, [], controlMap, makeRng());
    expect(result).toBe(10000);
  });

  it('same seed produces reproducible LM reductions with PERT', () => {
    const pertDist: Distribution = { type: 'pert', params: { min: 0.1, mode: 0.3, max: 0.6 } };
    const ctrl = makeControl('c1', pertDist);
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
    };
    const controlMap = new Map([['c1', ctrl]]);
    const r1 = applyLmReductions(10000, [assignment], controlMap, makeRng(42));
    const r2 = applyLmReductions(10000, [assignment], controlMap, makeRng(42));
    expect(r1).toBe(r2);
  });
});
