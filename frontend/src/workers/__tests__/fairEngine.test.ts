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

// -- v2 node helpers --

function eventNode(id: string, tef: Distribution): AttackTreeNode {
  return { id, type: 'event', label: id, position: { x: 0, y: 0 }, tef };
}

function conditionNode(id: string, probability: Distribution): AttackTreeNode {
  return { id, type: 'condition', label: id, position: { x: 0, y: 0 }, probability };
}

function outcomeNode(id: string, lossMagnitude: Distribution): AttackTreeNode {
  return { id, type: 'outcome', label: id, position: { x: 0, y: 0 }, lossMagnitude };
}

function gate(id: string, type: 'and' | 'or'): AttackTreeNode {
  return { id, type, label: id, position: { x: 0, y: 0 } };
}

function edge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, sourceId: source, targetId: target };
}

const constant = (v: number): Distribution => ({ type: 'constant', params: { value: v } });

// ---------- topologicalSort ----------

describe('topologicalSort', () => {
  it('single node returns [id]', () => {
    const nodes = [gate('root', 'or')];
    expect(topologicalSort(nodes, [])).toEqual(['root']);
  });

  it('linear chain: leaf first, root last', () => {
    const nodes = [gate('root', 'or'), gate('mid', 'or'), eventNode('l', constant(1))];
    const edges = [edge('root', 'mid'), edge('mid', 'l')];
    const sorted = topologicalSort(nodes, edges);
    expect(sorted.indexOf('l')).toBeLessThan(sorted.indexOf('mid'));
    expect(sorted.indexOf('mid')).toBeLessThan(sorted.indexOf('root'));
  });

  it('throws on cycle', () => {
    const nodes = [gate('a', 'or'), gate('b', 'or')];
    const edges = [edge('a', 'b'), edge('b', 'a')];
    expect(() => topologicalSort(nodes, edges)).toThrow('Tree contains a cycle');
  });
});

// ---------- evaluateTree: v2 node types ----------

describe('evaluateTree v2', () => {
  it('event node produces frequency from TEF', () => {
    const nodes = [eventNode('e', constant(10))];
    const sorted = topologicalSort(nodes, []);
    const result = evaluateTree(nodes, [], sorted, makeRng());
    expect(result.get('e')!.value).toBe(10);
    expect(result.get('e')!.domain).toBe('frequency');
  });

  it('condition node (leaf mode) produces probability', () => {
    const nodes = [conditionNode('c', constant(0.3))];
    const sorted = topologicalSort(nodes, []);
    const result = evaluateTree(nodes, [], sorted, makeRng());
    expect(result.get('c')!.value).toBeCloseTo(0.3, 10);
    expect(result.get('c')!.domain).toBe('probability');
  });

  it('condition node (filter mode) filters frequency by P', () => {
    const nodes = [conditionNode('c', constant(0.4)), eventNode('e', constant(100))];
    const edges = [edge('c', 'e')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('c')!.value).toBeCloseTo(40, 10); // 100 × 0.4
    expect(result.get('c')!.domain).toBe('frequency');
  });

  it('condition chain filters frequency cumulatively', () => {
    const nodes = [
      conditionNode('c1', constant(0.5)),
      conditionNode('c2', constant(0.3)),
      eventNode('e', constant(100)),
    ];
    const edges = [edge('c1', 'c2'), edge('c2', 'e')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('c1')!.value).toBeCloseTo(15, 10); // 100 × 0.3 × 0.5
    expect(result.get('c1')!.domain).toBe('frequency');
  });

  it('condition filter on probability child produces probability', () => {
    const nodes = [conditionNode('c1', constant(0.5)), conditionNode('c2', constant(0.6))];
    const edges = [edge('c1', 'c2')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('c1')!.value).toBeCloseTo(0.3, 10); // 0.6 × 0.5
    expect(result.get('c1')!.domain).toBe('probability');
  });
});

// ---------- AND gate ----------

describe('AND gate v2', () => {
  it('all probability children: product', () => {
    const nodes = [
      gate('g', 'and'),
      conditionNode('a', constant(0.3)),
      conditionNode('b', constant(0.5)),
    ];
    const edges = [edge('g', 'a'), edge('g', 'b')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('g')!.value).toBeCloseTo(0.15, 10);
    expect(result.get('g')!.domain).toBe('probability');
  });

  it('all frequency children: min (bottleneck)', () => {
    const nodes = [
      gate('g', 'and'),
      eventNode('e1', constant(10)),
      eventNode('e2', constant(3)),
    ];
    const edges = [edge('g', 'e1'), edge('g', 'e2')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('g')!.value).toBe(3); // min(10, 3)
    expect(result.get('g')!.domain).toBe('frequency');
  });

  it('mixed domain: min(freqs) × product(probs)', () => {
    const nodes = [
      gate('g', 'and'),
      conditionNode('c1', constant(0.4)),
      conditionNode('c2', constant(0.6)),
      eventNode('e', constant(100)),
    ];
    // c1 filters e (frequency 100 × 0.4 = 40), c2 is prob leaf (0.6)
    const edges = [edge('g', 'c1'), edge('g', 'c2'), edge('c1', 'e')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    // g: mixed AND — freq children = [c1 at 40], prob children = [c2 at 0.6]
    // min(40) × product(0.6) = 24
    expect(result.get('g')!.value).toBeCloseTo(24, 10);
    expect(result.get('g')!.domain).toBe('frequency');
  });
});

// ---------- OR gate ----------

describe('OR gate v2', () => {
  it('all probability children: inclusion-exclusion', () => {
    const nodes = [
      gate('g', 'or'),
      conditionNode('a', constant(0.3)),
      conditionNode('b', constant(0.3)),
    ];
    const edges = [edge('g', 'a'), edge('g', 'b')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    const expected = 1 - (1 - 0.3) * (1 - 0.3); // 0.51
    expect(result.get('g')!.value).toBeCloseTo(expected, 10);
    expect(result.get('g')!.domain).toBe('probability');
  });

  it('all frequency children: sum', () => {
    const nodes = [
      gate('g', 'or'),
      eventNode('e1', constant(10)),
      eventNode('e2', constant(5)),
    ];
    const edges = [edge('g', 'e1'), edge('g', 'e2')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('g')!.value).toBe(15); // 10 + 5
    expect(result.get('g')!.domain).toBe('frequency');
  });
});

// ---------- outcome node ----------

describe('outcome node', () => {
  it('sums child frequencies', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      eventNode('e1', constant(10)),
      eventNode('e2', constant(5)),
    ];
    const edges = [edge('o', 'e1'), edge('o', 'e2')];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());
    expect(result.get('o')!.value).toBe(15);
    expect(result.get('o')!.domain).toBe('frequency');
  });
});

// ---------- KEY CORRECTNESS CHECK: AND < OR ----------

describe('AND vs OR correctness', () => {
  it('AND gate produces LOWER value than OR gate for same inputs', () => {
    const makeTree = (gateType: 'and' | 'or') => {
      const nodes = [
        gate('g', gateType),
        conditionNode('a', constant(0.4)),
        conditionNode('b', constant(0.6)),
      ];
      const edges = [edge('g', 'a'), edge('g', 'b')];
      const sorted = topologicalSort(nodes, edges);
      return evaluateTree(nodes, edges, sorted, makeRng());
    };

    const andResult = makeTree('and').get('g')!.value;
    const orResult = makeTree('or').get('g')!.value;

    expect(andResult).toBeLessThan(orResult);
    expect(andResult).toBeCloseTo(0.24, 10); // 0.4 × 0.6
    expect(orResult).toBeCloseTo(0.76, 10); // 1 - 0.6 × 0.4
  });

  it('frequency domain: AND(min) < OR(sum)', () => {
    const makeTree = (gateType: 'and' | 'or') => {
      const nodes = [
        gate('g', gateType),
        eventNode('e1', constant(10)),
        eventNode('e2', constant(5)),
      ];
      const edges = [edge('g', 'e1'), edge('g', 'e2')];
      const sorted = topologicalSort(nodes, edges);
      return evaluateTree(nodes, edges, sorted, makeRng());
    };

    const andResult = makeTree('and').get('g')!.value;
    const orResult = makeTree('or').get('g')!.value;

    expect(andResult).toBe(5);  // min(10, 5)
    expect(orResult).toBe(15);  // 10 + 5
    expect(andResult).toBeLessThan(orResult);
  });
});

// ---------- Full tree: phishing example ----------

describe('full v2 tree', () => {
  it('phishing example produces correct ALE components', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      conditionNode('clicks', constant(0.4)),
      conditionNode('reaches', constant(0.3)),
      eventNode('phishing', constant(100)),
    ];
    const edges = [
      edge('o', 'clicks'),
      edge('clicks', 'reaches'),
      edge('reaches', 'phishing'),
    ];
    const sorted = topologicalSort(nodes, edges);
    const result = evaluateTree(nodes, edges, sorted, makeRng());

    // phishing: TEF = 100
    expect(result.get('phishing')!.value).toBe(100);
    // reaches: 100 × 0.3 = 30
    expect(result.get('reaches')!.value).toBeCloseTo(30, 10);
    // clicks: 30 × 0.4 = 12
    expect(result.get('clicks')!.value).toBeCloseTo(12, 10);
    // outcome: sum = 12
    expect(result.get('o')!.value).toBeCloseTo(12, 10);
  });
});

// ---------- control reductions ----------

describe('control reductions v2', () => {
  it('control reduces event TEF', () => {
    const nodes = [eventNode('e', constant(10))];
    const sorted = topologicalSort(nodes, []);

    const control: Control = {
      id: 'c1',
      name: 'Test',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constant(0.5),
      metadata: { created: '', modified: '' },
    };
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'e',
      enabled: true,
    };

    const nodeAssignments = new Map([['e', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    expect(result.get('e')!.value).toBeCloseTo(5, 10); // 10 × (1 - 0.5)
  });

  it('control reduces condition probability', () => {
    const nodes = [conditionNode('c', constant(0.8))];
    const sorted = topologicalSort(nodes, []);

    const control: Control = {
      id: 'c1',
      name: 'Test',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constant(0.5),
      metadata: { created: '', modified: '' },
    };
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'c',
      enabled: true,
    };

    const nodeAssignments = new Map([['c', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    expect(result.get('c')!.value).toBeCloseTo(0.4, 10); // 0.8 × (1 - 0.5)
  });

  it('disabled control is ignored', () => {
    const nodes = [eventNode('e', constant(10))];
    const sorted = topologicalSort(nodes, []);

    const control: Control = {
      id: 'c1',
      name: 'Test',
      category: 'preventive',
      attackTechniques: [],
      d3fendTechniques: [],
      lefReduction: constant(0.5),
      metadata: { created: '', modified: '' },
    };
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'e',
      enabled: false,
    };

    const nodeAssignments = new Map([['e', [assignment]]]);
    const controlMap = new Map([['c1', control]]);

    const result = evaluateTree(nodes, [], sorted, makeRng(), nodeAssignments, controlMap);
    expect(result.get('e')!.value).toBe(10);
  });
});

// ---------- reproducibility ----------

describe('evaluateTree - reproducibility', () => {
  const pertTef: Distribution = { type: 'pert', params: { min: 1, mode: 5, max: 20 } };

  it('same seed produces identical results', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      eventNode('e1', pertTef),
      eventNode('e2', pertTef),
    ];
    const edges = [edge('o', 'e1'), edge('o', 'e2')];
    const sorted = topologicalSort(nodes, edges);

    const result1 = evaluateTree(nodes, edges, sorted, makeRng(42));
    const result2 = evaluateTree(nodes, edges, sorted, makeRng(42));

    expect(result1.get('e1')!.value).toBe(result2.get('e1')!.value);
    expect(result1.get('e2')!.value).toBe(result2.get('e2')!.value);
    expect(result1.get('o')!.value).toBe(result2.get('o')!.value);
  });

  it('different seeds produce different results', () => {
    const nodes = [eventNode('e', pertTef)];
    const sorted = topologicalSort(nodes, []);

    const result1 = evaluateTree(nodes, [], sorted, makeRng(1));
    const result2 = evaluateTree(nodes, [], sorted, makeRng(99999));

    expect(result1.get('e')!.value).not.toBe(result2.get('e')!.value);
  });
});

// ---------- validateScenario v2 ----------

describe('validateScenario v2', () => {
  const validConfig: SimulationConfig = {
    iterations: 10000,
    seed: 42,
    confidenceIntervals: [0.1, 0.5, 0.9],
  };

  it('valid v2 scenario returns empty errors', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      eventNode('e', constant(5)),
    ];
    const edges = [edge('o', 'e')];
    expect(validateScenario(nodes, edges, validConfig)).toEqual([]);
  });

  it('outcome missing LM', () => {
    const nodes: AttackTreeNode[] = [
      { id: 'o', type: 'outcome', label: 'O', position: { x: 0, y: 0 } },
      eventNode('e', constant(5)),
    ];
    const edges = [edge('o', 'e')];
    const errors = validateScenario(nodes, edges, validConfig);
    expect(errors.some((e) => e.includes('Loss Magnitude'))).toBe(true);
  });

  it('event missing TEF', () => {
    const nodes: AttackTreeNode[] = [
      outcomeNode('o', constant(100000)),
      { id: 'e', type: 'event', label: 'E', position: { x: 0, y: 0 } },
    ];
    const edges = [edge('o', 'e')];
    const errors = validateScenario(nodes, edges, validConfig);
    expect(errors.some((e) => e.includes('TEF'))).toBe(true);
  });

  it('event with children is invalid', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      eventNode('e', constant(5)),
      conditionNode('c', constant(0.5)),
    ];
    const edges = [edge('o', 'e'), edge('e', 'c')];
    const errors = validateScenario(nodes, edges, validConfig);
    expect(errors.some((e) => e.includes('leaf'))).toBe(true);
  });

  it('condition with 2+ children is invalid', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      conditionNode('c', constant(0.5)),
      eventNode('e1', constant(5)),
      eventNode('e2', constant(3)),
    ];
    const edges = [edge('o', 'c'), edge('c', 'e1'), edge('c', 'e2')];
    const errors = validateScenario(nodes, edges, validConfig);
    expect(errors.some((e) => e.includes('at most 1'))).toBe(true);
  });

  it('gate with < 2 children is invalid', () => {
    const nodes = [
      outcomeNode('o', constant(100000)),
      gate('g', 'or'),
      eventNode('e', constant(5)),
    ];
    const edges = [edge('o', 'g'), edge('g', 'e')];
    const errors = validateScenario(nodes, edges, validConfig);
    expect(errors.some((e) => e.includes('at least 2'))).toBe(true);
  });
});

// ---------- v1 backward compat ----------

describe('v1 backward compatibility', () => {
  const validConfig: SimulationConfig = {
    iterations: 10000,
    seed: 42,
    confidenceIntervals: [0.1, 0.5, 0.9],
  };
  const validLM: Distribution = { type: 'pert', params: { min: 1000, mode: 5000, max: 10000 } };

  it('v1 leaf node evaluates as frequency', () => {
    const nodes: AttackTreeNode[] = [
      { id: 'l', type: 'leaf' as any, label: 'l', position: { x: 0, y: 0 }, fairInputs: { lef: constant(5) } },
    ];
    const sorted = topologicalSort(nodes, []);
    const result = evaluateTree(nodes, [], sorted, makeRng());
    expect(result.get('l')!.value).toBe(5);
    expect(result.get('l')!.domain).toBe('frequency');
  });

  it('v1 scenario validates with scenario-level LM', () => {
    const nodes: AttackTreeNode[] = [
      { id: 'root', type: 'or' as any, label: 'root', position: { x: 0, y: 0 } },
      { id: 'l', type: 'leaf' as any, label: 'l', position: { x: 0, y: 0 }, fairInputs: { lef: constant(5) } },
    ];
    const edges = [edge('root', 'l')];
    expect(validateScenario(nodes, edges, validConfig, validLM)).toEqual([]);
  });
});

// ---------- applyLmReductions (unchanged) ----------

describe('applyLmReductions', () => {
  const makeControl = (id: string, lmReduction?: Distribution): Control => ({
    id,
    name: id,
    category: 'preventive',
    attackTechniques: [],
    d3fendTechniques: [],
    lefReduction: constant(0.5),
    lmReduction,
    metadata: { created: '', modified: '' },
  });

  it('single control with LM reduction', () => {
    const ctrl = makeControl('c1', constant(0.4));
    const assignment: ControlAssignment = {
      id: 'a1',
      controlId: 'c1',
      nodeId: 'l',
      enabled: true,
    };
    const controlMap = new Map([['c1', ctrl]]);
    const result = applyLmReductions(10000, [assignment], controlMap, makeRng());
    expect(result).toBeCloseTo(6000, 5);
  });

  it('empty assignments returns base LM', () => {
    const controlMap = new Map<string, Control>();
    const result = applyLmReductions(10000, [], controlMap, makeRng());
    expect(result).toBe(10000);
  });
});
