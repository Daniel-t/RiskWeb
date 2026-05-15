import type { Scenario, SimulationResult } from '@shared/index';
import { topologicalSort, evaluateTree, validateScenario } from './fairEngine';
import { sampleDistribution } from './distributions';

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SimulationRequest {
  type: 'start';
  scenario: Scenario;
}

interface SimulationCancel {
  type: 'cancel';
}

type WorkerMessage = SimulationRequest | SimulationCancel;

let cancelled = false;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (e.data.type === 'start') {
    cancelled = false;
    runSimulation(e.data.scenario);
  }
};

function runSimulation(scenario: Scenario) {
  const { nodes, edges, lossMagnitude, simulationConfig } = scenario;
  const { iterations, seed, confidenceIntervals } = simulationConfig;

  // Validate
  const errors = validateScenario(nodes, edges, simulationConfig, lossMagnitude);
  if (errors.length > 0) {
    self.postMessage({ type: 'error', errors });
    return;
  }

  // Initialize PRNG
  const rng = seed != null ? mulberry32(seed) : Math.random.bind(Math);

  // Topological sort
  let sortedOrder: string[];
  try {
    sortedOrder = topologicalSort(nodes, edges);
  } catch {
    self.postMessage({ type: 'error', errors: ['Tree contains a cycle'] });
    return;
  }

  // Find root (last in sorted order)
  const rootId = sortedOrder[sortedOrder.length - 1];

  const progressInterval = Math.max(1, Math.floor(iterations / 100));

  // Per-node LEF accumulators
  const nodeIds = nodes.map((n) => n.id);
  const perNodeLEFs = new Map<string, number[]>();
  for (const id of nodeIds) perNodeLEFs.set(id, []);

  const rootALEs: number[] = [];
  const startTime = performance.now();

  for (let k = 0; k < iterations; k++) {
    // Check cancellation
    if (k % progressInterval === 0 && cancelled) {
      return;
    }

    // Evaluate tree (frequency aggregation only)
    const iterResult = evaluateTree(nodes, edges, sortedOrder, rng);

    // Sample scenario-level LM
    const lm = sampleDistribution(lossMagnitude!, rng);

    // Compute ALE at root
    const rootLEF = iterResult.get(rootId)!.lef;
    const ale = rootLEF * lm;
    rootALEs.push(isFinite(ale) ? ale : 0);

    // Store per-node LEF
    for (const id of nodeIds) {
      perNodeLEFs.get(id)!.push(iterResult.get(id)!.lef);
    }

    // Progress
    if ((k + 1) % progressInterval === 0) {
      const percent = Math.floor(((k + 1) / iterations) * 100);
      self.postMessage({ type: 'progress', percent, iterationsComplete: k + 1 });
    }
  }

  if (cancelled) return;

  const duration = performance.now() - startTime;

  // Compute summary stats
  const summary = computeStats(rootALEs, confidenceIntervals);
  const perNode: SimulationResult['perNode'] = {};
  for (const id of nodeIds) {
    const lefs = perNodeLEFs.get(id)!;
    const stats = computeStats(lefs, confidenceIntervals);
    perNode[id] = { meanLEF: stats.mean, percentiles: stats.percentiles };
  }

  const result: SimulationResult = {
    summary: {
      mean: summary.mean,
      stddev: summary.stddev,
      percentiles: summary.percentiles,
    },
    perNode,
    iterations,
    duration,
  };

  self.postMessage({ type: 'complete', result, rawALEValues: rootALEs });
}

function computeStats(
  values: number[],
  confidenceIntervals: number[],
): { mean: number; stddev: number; percentiles: Record<number, number> } {
  const n = values.length;
  if (n === 0) {
    return { mean: 0, stddev: 0, percentiles: {} };
  }

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1);
  const stddev = Math.sqrt(variance || 0);

  const sorted = [...values].sort((a, b) => a - b);
  const percentiles: Record<number, number> = {};
  for (const p of confidenceIntervals) {
    const index = Math.floor(p * n);
    percentiles[p] = sorted[Math.min(index, n - 1)];
  }

  return { mean, stddev, percentiles };
}
