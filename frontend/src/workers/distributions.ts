import type { Distribution } from '@shared/index';

/**
 * Marsaglia & Tsang's method for Gamma(shape, 1) sampling.
 * Requires shape >= 1. For shape < 1, use the boost: Gamma(a) = Gamma(a+1) * U^(1/a).
 */
function gammaRandom(shape: number, rng: () => number): number {
  if (shape < 1) {
    return gammaRandom(shape + 1, rng) * Math.pow(rng(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normalRandom(rng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Box-Muller transform for standard normal sampling. */
function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function samplePERT(min: number, mode: number, max: number, rng: () => number): number {
  if (min === max) return min;

  const lambda = 4;
  const range = max - min;
  const alpha = 1 + (lambda * (mode - min)) / range;
  const beta = 1 + (lambda * (max - mode)) / range;

  const g1 = gammaRandom(alpha, rng);
  const g2 = gammaRandom(beta, rng);
  const x = g1 / (g1 + g2);

  return min + x * range;
}

function sampleLognormal(mu: number, sigma: number, rng: () => number): number {
  const z = normalRandom(rng);
  return Math.exp(mu + sigma * z);
}

function sampleConstant(value: number): number {
  return value;
}

export function sampleDistribution(dist: Distribution, rng: () => number): number {
  switch (dist.type) {
    case 'pert':
      return samplePERT(dist.params.min, dist.params.mode, dist.params.max, rng);
    case 'lognormal':
      return sampleLognormal(dist.params.mu, dist.params.sigma, rng);
    case 'constant':
      return sampleConstant(dist.params.value);
  }
}
