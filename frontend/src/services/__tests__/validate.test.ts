import { describe, it, expect } from 'vitest';
import { validateScenario } from '../validate';

function minimalScenario() {
  return {
    id: 'test-id',
    name: 'Test Scenario',
    description: '',
    nodes: [
      { id: 'n1', type: 'leaf', label: 'Leaf', position: { x: 0, y: 0 } },
    ],
    edges: [],
    simulationConfig: { iterations: 10000, confidenceIntervals: [0.5] },
    metadata: { created: '2026-01-01', modified: '2026-01-01' },
  };
}

describe('validateScenario (type guard)', () => {
  it('valid minimal scenario returns true', () => {
    expect(validateScenario(minimalScenario())).toBe(true);
  });

  it('null returns false', () => {
    expect(validateScenario(null)).toBe(false);
  });

  it('undefined returns false', () => {
    expect(validateScenario(undefined)).toBe(false);
  });

  it('missing id returns false', () => {
    const s = minimalScenario();
    delete (s as Record<string, unknown>).id;
    expect(validateScenario(s)).toBe(false);
  });

  it('empty name returns false', () => {
    const s = minimalScenario();
    s.name = '';
    expect(validateScenario(s)).toBe(false);
  });

  it('name > 200 chars returns false', () => {
    const s = minimalScenario();
    s.name = 'x'.repeat(201);
    expect(validateScenario(s)).toBe(false);
  });

  it('missing nodes array returns false', () => {
    const s = minimalScenario();
    delete (s as Record<string, unknown>).nodes;
    expect(validateScenario(s)).toBe(false);
  });

  it('invalid node type returns false', () => {
    const s = minimalScenario();
    (s.nodes[0] as Record<string, unknown>).type = 'invalid';
    expect(validateScenario(s)).toBe(false);
  });

  it('edge missing sourceId returns false', () => {
    const s = minimalScenario();
    s.edges = [{ id: 'e1', targetId: 'n1' } as never];
    expect(validateScenario(s)).toBe(false);
  });

  it('missing simulationConfig returns false', () => {
    const s = minimalScenario();
    delete (s as Record<string, unknown>).simulationConfig;
    expect(validateScenario(s)).toBe(false);
  });
});
