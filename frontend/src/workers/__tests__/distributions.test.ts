import { describe, it, expect } from 'vitest';
import { sampleDistribution } from '../distributions';
import { mulberry32 } from '../prng';
import type { Distribution } from '@shared/index';

function makeRng(seed = 12345) {
  return mulberry32(seed);
}

describe('sampleDistribution', () => {
  describe('constant', () => {
    it('returns exact value', () => {
      const dist: Distribution = { type: 'constant', params: { value: 42 } };
      expect(sampleDistribution(dist, makeRng())).toBe(42);
    });

    it('returns zero for value=0', () => {
      const dist: Distribution = { type: 'constant', params: { value: 0 } };
      expect(sampleDistribution(dist, makeRng())).toBe(0);
    });
  });

  describe('PERT', () => {
    const dist: Distribution = { type: 'pert', params: { min: 1, mode: 5, max: 10 } };

    it('samples within [min, max]', () => {
      const rng = makeRng();
      for (let i = 0; i < 10_000; i++) {
        const v = sampleDistribution(dist, rng);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    });

    it('mean approximates (min + 4*mode + max) / 6', () => {
      const rng = makeRng();
      const n = 50_000;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += sampleDistribution(dist, rng);
      const mean = sum / n;
      const expected = (1 + 4 * 5 + 10) / 6; // 5.167
      expect(mean).toBeCloseTo(expected, 0); // within 0.5
    });

    it('returns min when min === max', () => {
      const degenerate: Distribution = { type: 'pert', params: { min: 5, mode: 5, max: 5 } };
      const rng = makeRng();
      for (let i = 0; i < 100; i++) {
        expect(sampleDistribution(degenerate, rng)).toBe(5);
      }
    });
  });

  describe('lognormal', () => {
    const dist: Distribution = { type: 'lognormal', params: { mu: 0, sigma: 1 } };

    it('produces positive values', () => {
      const rng = makeRng();
      for (let i = 0; i < 10_000; i++) {
        expect(sampleDistribution(dist, rng)).toBeGreaterThan(0);
      }
    });

    it('mean approximates exp(mu + sigma^2/2)', () => {
      const rng = makeRng();
      const n = 50_000;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += sampleDistribution(dist, rng);
      const mean = sum / n;
      const expected = Math.exp(0 + 1 / 2); // e^0.5 ~ 1.6487
      expect(mean).toBeCloseTo(expected, 0);
    });
  });

  describe('determinism', () => {
    it('same seed produces identical sequence', () => {
      const dist: Distribution = { type: 'pert', params: { min: 0, mode: 5, max: 10 } };
      const rng1 = makeRng(42);
      const rng2 = makeRng(42);
      for (let i = 0; i < 100; i++) {
        expect(sampleDistribution(dist, rng1)).toBe(sampleDistribution(dist, rng2));
      }
    });
  });
});
