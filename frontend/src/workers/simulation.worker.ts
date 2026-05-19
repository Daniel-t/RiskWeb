import type { Scenario, SimulationResult, Control, ControlAssignment } from '@shared/index';
import { topologicalSort, evaluateTree, validateScenario } from './fairEngine';
import { sampleDistribution } from './distributions';
import { mulberry32 } from './prng';

interface SimulationRequest {
  type: 'start';
  scenario: Scenario;
  controls?: Control[];
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
    runSimulation(e.data.scenario, e.data.controls ?? []);
  }
};

function runSimulation(scenario: Scenario, controls: Control[]) {
  const { nodes, edges, lossMagnitude, simulationConfig, controlAssignments } = scenario;
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

  // Build control lookup maps
  const controlMap = new Map<string, Control>();
  for (const c of controls) controlMap.set(c.id, c);

  const nodeAssignments = new Map<string, ControlAssignment[]>();
  const lmAssignments: ControlAssignment[] = [];
  const controlWarnings: string[] = [];

  if (controlAssignments && controlAssignments.length > 0) {
    for (const a of controlAssignments) {
      if (!controlMap.has(a.controlId)) {
        const msg = `Control '${a.controlId}' not found (orphaned assignment)`;
        if (!controlWarnings.includes(msg)) controlWarnings.push(msg);
        continue;
      }
      // LEF assignments grouped by node
      const existing = nodeAssignments.get(a.nodeId) ?? [];
      existing.push(a);
      nodeAssignments.set(a.nodeId, existing);

      // LM assignments collected separately
      const ctrl = controlMap.get(a.controlId)!;
      if (ctrl.lmReduction) {
        lmAssignments.push(a);
      }
    }
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
  let excessiveReductionWarned = false;

  for (let k = 0; k < iterations; k++) {
    // Check cancellation
    if (k % progressInterval === 0 && cancelled) {
      return;
    }

    // Evaluate tree (frequency aggregation with control reductions)
    const iterResult = evaluateTree(nodes, edges, sortedOrder, rng, nodeAssignments, controlMap);

    // Sample scenario-level LM
    let lm = sampleDistribution(lossMagnitude!, rng);

    // Apply LM reductions from controls
    if (lmAssignments.length > 0) {
      let lmPassThrough = 1;
      for (const a of lmAssignments) {
        if (!a.enabled) continue;
        const ctrl = controlMap.get(a.controlId)!;
        const dist = a.lmReductionOverride ?? ctrl.lmReduction!;
        const reduction = sampleDistribution(dist, rng);
        lmPassThrough *= 1 - Math.max(0, Math.min(1, reduction));
      }
      lmPassThrough = Math.max(0, Math.min(1, lmPassThrough));
      lm *= lmPassThrough;
    }

    // Compute ALE at root
    const rootLEF = iterResult.get(rootId)!.lef;
    const ale = rootLEF * lm;
    rootALEs.push(isFinite(ale) ? ale : 0);

    // Store per-node LEF
    for (const id of nodeIds) {
      perNodeLEFs.get(id)!.push(iterResult.get(id)!.lef);
    }

    // Check for excessive reduction (only on first iteration to avoid spam)
    if (k === 0 && !excessiveReductionWarned) {
      for (const [nId, assignments] of nodeAssignments) {
        const enabledCount = assignments.filter((a) => a.enabled && controlMap.has(a.controlId)).length;
        if (enabledCount >= 3) {
          // Compute mode-based combined reduction to check
          let modePassThrough = 1;
          for (const a of assignments) {
            if (!a.enabled) continue;
            const ctrl = controlMap.get(a.controlId);
            if (!ctrl) continue;
            const dist = a.lefReductionOverride ?? ctrl.lefReduction;
            let mode = 0;
            if (dist.type === 'pert') mode = dist.params.mode;
            else if (dist.type === 'constant') mode = dist.params.value;
            modePassThrough *= 1 - mode;
          }
          if (1 - modePassThrough > 0.99) {
            const nodeName = nodes.find((n) => n.id === nId)?.label ?? nId;
            controlWarnings.push(`Node '${nodeName}': combined reduction exceeds 99% — residual risk may be unrealistically low`);
            excessiveReductionWarned = true;
          }
        }
      }
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
    controlWarnings: controlWarnings.length > 0 ? controlWarnings : undefined,
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
