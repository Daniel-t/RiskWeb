import { describe, it, expect } from 'vitest';
import {
  getAttackTechniques,
  getAttackTechnique,
  getD3fendTechniques,
  getD3fendTechnique,
  getMappings,
} from '../catalog';

describe('catalog service', () => {
  describe('getAttackTechniques', () => {
    it('returns non-empty array of all techniques', () => {
      const techniques = getAttackTechniques();
      expect(techniques.length).toBeGreaterThan(0);
    });

    it('each technique has required fields', () => {
      const techniques = getAttackTechniques();
      for (const t of techniques) {
        expect(t).toHaveProperty('id');
        expect(t).toHaveProperty('name');
        expect(t).toHaveProperty('tactic');
        expect(t).toHaveProperty('d3fendCountermeasures');
        expect(Array.isArray(t.d3fendCountermeasures)).toBe(true);
      }
    });

    it('filters by tactic', () => {
      const all = getAttackTechniques();
      const filtered = getAttackTechniques('initial-access');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThan(all.length);
      for (const t of filtered) {
        expect(t.tactic).toBe('initial-access');
      }
    });

    it('returns empty array for unknown tactic', () => {
      expect(getAttackTechniques('nonexistent-tactic')).toEqual([]);
    });

    it('includes d3fendCountermeasures cross-reference', () => {
      const t = getAttackTechniques().find((tech) => tech.id === 'T1566');
      expect(t).toBeDefined();
      expect(t!.d3fendCountermeasures).toContain('D3-MFA');
    });
  });

  describe('getAttackTechnique', () => {
    it('returns technique by known ID', () => {
      const t = getAttackTechnique('T1566');
      expect(t).toBeDefined();
      expect(t!.name).toBe('Phishing');
      expect(t!.tactic).toBe('initial-access');
    });

    it('returns undefined for unknown ID', () => {
      expect(getAttackTechnique('T9999')).toBeUndefined();
    });
  });

  describe('getD3fendTechniques', () => {
    it('returns non-empty array', () => {
      const techniques = getD3fendTechniques();
      expect(techniques.length).toBeGreaterThan(0);
    });

    it('each technique has valid structure', () => {
      const techniques = getD3fendTechniques();
      for (const t of techniques) {
        expect(t.id).toMatch(/^D3-/);
        expect(t).toHaveProperty('name');
        expect(t).toHaveProperty('category');
        expect(Array.isArray(t.counters)).toBe(true);
      }
    });
  });

  describe('getD3fendTechnique', () => {
    it('returns technique by known ID', () => {
      const t = getD3fendTechnique('D3-MFA');
      expect(t).toBeDefined();
      expect(t!.name).toContain('Multi-factor Authentication');
    });

    it('returns undefined for unknown ID', () => {
      expect(getD3fendTechnique('D3-FAKE')).toBeUndefined();
    });
  });

  describe('getMappings', () => {
    it('returns non-empty array with no filters', () => {
      const mappings = getMappings();
      expect(mappings.length).toBeGreaterThan(0);
    });

    it('filters by attackId', () => {
      const mappings = getMappings('T1078');
      expect(mappings.length).toBeGreaterThan(0);
      for (const m of mappings) {
        expect(m.attackId).toBe('T1078');
      }
    });

    it('filters by d3fendId', () => {
      const mappings = getMappings(undefined, 'D3-MFA');
      expect(mappings.length).toBeGreaterThan(0);
      for (const m of mappings) {
        expect(m.d3fendId).toBe('D3-MFA');
      }
    });

    it('filters by both attackId and d3fendId', () => {
      const mappings = getMappings('T1078', 'D3-MFA');
      expect(mappings).toHaveLength(1);
      expect(mappings[0].attackId).toBe('T1078');
      expect(mappings[0].d3fendId).toBe('D3-MFA');
    });

    it('returns empty array for unknown attackId', () => {
      expect(getMappings('T9999')).toEqual([]);
    });

    it('each mapping has suggestedLefReduction as PERT distribution', () => {
      const mappings = getMappings();
      for (const m of mappings) {
        expect(m.suggestedLefReduction).toBeDefined();
        expect(m.suggestedLefReduction!.type).toBe('pert');
        expect(m.suggestedLefReduction!.params).toHaveProperty('min');
        expect(m.suggestedLefReduction!.params).toHaveProperty('mode');
        expect(m.suggestedLefReduction!.params).toHaveProperty('max');
      }
    });
  });
});
