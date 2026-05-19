import { describe, it, expect } from 'vitest';
import { topologicalSort, evaluateTree, validateScenario } from '../fairEngine';
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
