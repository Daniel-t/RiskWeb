import { describe, it, expect } from 'vitest';
import { validateScenario } from '../validate';

function minimalScenario() {
  return {
    id: 'test-id',
    name: 'Test Scenario',
    description: '',
    nodes: [{ id: 'n1', type: 'leaf', label: 'Leaf', position: { x: 0, y: 0 } }],
    edges: [],
    simulationConfig: { iterations: 10000, confidenceIntervals: [0.5] },
    metadata: { created: '2026-01-01', modified: '2026-01-01' },
  };
}

describe('validateScenario', () => {
  it('valid minimal scenario returns valid', () => {
    const result = validateScenario(minimalScenario());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('null returns invalid', () => {
    const result = validateScenario(null);
    expect(result.valid).toBe(false);
  });

  it('undefined returns invalid', () => {
    const result = validateScenario(undefined);
    expect(result.valid).toBe(false);
  });

  it('missing id returns invalid', () => {
    const s = minimalScenario();
    delete (s as Record<string, unknown>).id;
    expect(validateScenario(s).valid).toBe(false);
  });

  it('empty name returns invalid', () => {
    const s = minimalScenario();
    s.name = '';
    expect(validateScenario(s).valid).toBe(false);
  });

  it('name > 200 chars returns invalid', () => {
    const s = minimalScenario();
    s.name = 'x'.repeat(201);
    expect(validateScenario(s).valid).toBe(false);
  });

  it('missing nodes array returns invalid', () => {
    const s = minimalScenario();
    delete (s as Record<string, unknown>).nodes;
    expect(validateScenario(s).valid).toBe(false);
  });

  it('invalid node type returns invalid', () => {
    const s = minimalScenario();
    (s.nodes[0] as Record<string, unknown>).type = 'invalid';
    expect(validateScenario(s).valid).toBe(false);
  });

  it('edge missing sourceId returns invalid', () => {
    const s = minimalScenario();
    s.edges = [{ id: 'e1', targetId: 'n1' } as never];
    expect(validateScenario(s).valid).toBe(false);
  });

  it('missing simulationConfig returns invalid', () => {
    const s = minimalScenario();
    delete (s as Record<string, unknown>).simulationConfig;
    expect(validateScenario(s).valid).toBe(false);
  });
});

describe('validateScenario controlAssignments', () => {
  it('absent controlAssignments is valid (backward compat)', () => {
    const result = validateScenario(minimalScenario());
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('valid assignment passes', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [{ id: 'a1', controlId: 'c1', nodeId: 'n1', enabled: true }],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(true);
    expect(result.scenario!.controlAssignments).toHaveLength(1);
  });

  it('non-array controlAssignments is an error', () => {
    const s = { ...minimalScenario(), controlAssignments: 'bad' };
    const result = validateScenario(s);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('controlAssignments must be an array');
  });

  it('assignment with missing controlId is rejected', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [{ id: 'a1', nodeId: 'n1', enabled: true }],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(false);
  });

  it('assignment with nonexistent nodeId is stripped with warning', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [{ id: 'a1', controlId: 'c1', nodeId: 'missing', enabled: true }],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('not found in scenario nodes');
  });

  it('duplicate assignments are deduplicated with warning', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [
        { id: 'a1', controlId: 'c1', nodeId: 'n1', enabled: true },
        { id: 'a2', controlId: 'c1', nodeId: 'n1', enabled: false },
      ],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(true);
    expect(result.scenario!.controlAssignments).toHaveLength(1);
    expect(result.warnings.some((w) => w.includes('duplicate'))).toBe(true);
  });

  it('enabled defaults to true when missing', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [{ id: 'a1', controlId: 'c1', nodeId: 'n1' }],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(true);
    expect(result.scenario!.controlAssignments![0].enabled).toBe(true);
  });

  it('invalid lefReductionOverride is stripped with warning', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [
        {
          id: 'a1',
          controlId: 'c1',
          nodeId: 'n1',
          enabled: true,
          lefReductionOverride: { type: 'bad', params: {} },
        },
      ],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(true);
    expect(result.scenario!.controlAssignments![0].lefReductionOverride).toBeUndefined();
    expect(result.warnings.some((w) => w.includes('lefReductionOverride stripped'))).toBe(true);
  });

  it('valid distribution override is preserved', () => {
    const s = {
      ...minimalScenario(),
      controlAssignments: [
        {
          id: 'a1',
          controlId: 'c1',
          nodeId: 'n1',
          enabled: true,
          lefReductionOverride: { type: 'constant', params: { value: 0.3 } },
        },
      ],
    };
    const result = validateScenario(s);
    expect(result.valid).toBe(true);
    expect(result.scenario!.controlAssignments![0].lefReductionOverride).toEqual({
      type: 'constant',
      params: { value: 0.3 },
    });
  });
});
