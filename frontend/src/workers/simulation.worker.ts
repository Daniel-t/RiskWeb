import type { Scenario, SimulationResult, Control, ControlAssignment } from '@shared/index';
import { topologicalSort, evaluateTree, validateScenario, applyLmReductions } from './fairEngine';
import { sampleDistribution } from './distributions';
import { mulberry32 } from './prng';
import { runControlToggle, runOATSweep } from './sensitivityEngine';

interface SimulationRequest {
  type: 'start';
  scenario: Scenario;
  controls?: Control[];
}

interface SensitivityRequest {
  type: 'sensitivity';
  sensitivityType: 'controlToggle' | 'oatSweep';
  scenario: Scenario;
  controls: Control[];
  seed: number;
}

interface SimulationCancel {
  type: 'cancel';
}

type WorkerMessage = SimulationRequest | SimulationCancel | SensitivityRequest;

let cancelled = false;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (e.data.type === 'sensitivity') {
    cancelled = false;
    const { sensitivityType, scenario, controls, seed } = e.data;
    const engine = sensitivityType === 'controlToggle' ? runControlToggle : runOATSweep;
    const result = engine(scenario, controls, seed, (completed, total) => {
      if (cancelled) return;
      self.postMessage({
        type: 'sensitivityProgress',
        percent: Math.round((completed / total) * 100),
      });
    });
    if (!cancelled) {
      self.postMessage({ type: 'sensitivityComplete', result });
    }
    return;
  }

  if (e.data.type === 'start') {
    cancelled = false;
    const { scenario, controls = [] } = e.data;

    // Determine if controls are assigned and any are enabled
    const hasEnabledAssignments =
      (scenario.controlAssignments ?? []).some((a) => a.enabled) && controls.length > 0;

    if (hasEnabledAssignments) {
      runDualSimulation(scenario, controls);
    } else {
      runSimulation(scenario, controls, 'single', 0, 100);
    }
  }
};

function runDualSimulation(scenario: Scenario, controls: Control[]) {
  // Pass 1: Baseline (no control reductions)
  const baselineScenario: Scenario = {
    ...scenario,
    controlAssignments: undefined,
  };
  const baselineResult = runSimulation(baselineScenario, [], 'baseline', 0, 50);
  if (!baselineResult || cancelled) return;

  // Pass 2: Controlled (with control reductions, same seed)
  const controlledResult = runSimulation(scenario, controls, 'controlled', 50, 100);
  if (!controlledResult || cancelled) return;

  self.postMessage({
    type: 'complete',
    result: controlledResult.result,
    rawALEValues: controlledResult.rawALEValues,
    baselineResult: baselineResult.result,
    baselineRawALE: baselineResult.rawALEValues,
  });
}

interface RunResult {
  result: SimulationResult;
  rawALEValues: number[];
}

function runSimulation(
  scenario: Scenario,
  controls: Control[],
  mode: 'single' | 'baseline' | 'controlled',
  progressStart: number,
  progressEnd: number,
): RunResult | null {
  const { nodes, edges, lossMagnitude, simulationConfig, controlAssignments } = scenario;
  const { iterations, seed, confidenceIntervals } = simulationConfig;

  // Validate
  const errors = validateScenario(nodes, edges, simulationConfig, lossMagnitude);
  if (errors.length > 0) {
    self.postMessage({ type: 'error', errors });
    return null;
  }

  // Initialize PRNG (same seed for both passes to ensure comparability)
  const rng = seed != null ? mulberry32(seed) : Math.random.bind(Math);

  // Topological sort
  let sortedOrder: string[];
  try {
    sortedOrder = topologicalSort(nodes, edges);
  } catch {
    self.postMessage({ type: 'error', errors: ['Tree contains a cycle'] });
    return null;
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
  const progressRange = progressEnd - progressStart;

  // Per-node LEF/TEF/Vulnerability accumulators
  const nodeIds = nodes.map((n) => n.id);
  const perNodeLEFs = new Map<string, number[]>();
  const perNodeTEFs = new Map<string, number[]>();
  const perNodeVulns = new Map<string, number[]>();
  for (const id of nodeIds) {
    perNodeLEFs.set(id, []);
    perNodeTEFs.set(id, []);
    perNodeVulns.set(id, []);
  }

  const rootALEs: number[] = [];
  const startTime = performance.now();
  let excessiveReductionWarned = false;

  for (let k = 0; k < iterations; k++) {
    // Check cancellation and wall-clock timeout
    if (k % progressInterval === 0) {
      if (cancelled) return null;
      if (performance.now() - startTime > 120_000) {
        self.postMessage({ type: 'error', errors: ['Simulation timed out after 120 seconds'] });
        return null;
      }
    }

    // Evaluate tree (frequency aggregation with control reductions)
    const iterResult = evaluateTree(nodes, edges, sortedOrder, rng, nodeAssignments, controlMap);

    // Sample scenario-level LM and apply control reductions
    const baseLm = sampleDistribution(lossMagnitude!, rng);
    const lm = applyLmReductions(baseLm, lmAssignments, controlMap, rng);

    // Compute ALE at root
    const rootLEF = iterResult.get(rootId)!.lef;
    const ale = rootLEF * lm;
    rootALEs.push(isFinite(ale) ? ale : 0);

    // Store per-node LEF/TEF/Vulnerability
    for (const id of nodeIds) {
      const nr = iterResult.get(id)!;
      perNodeLEFs.get(id)!.push(nr.lef);
      if (nr.tef !== undefined) perNodeTEFs.get(id)!.push(nr.tef);
      if (nr.vulnerability !== undefined) perNodeVulns.get(id)!.push(nr.vulnerability);
    }

    // Check for excessive reduction (only on first iteration to avoid spam)
    if (k === 0 && !excessiveReductionWarned) {
      for (const [nId, assignments] of nodeAssignments) {
        const enabledCount = assignments.filter(
          (a) => a.enabled && controlMap.has(a.controlId),
        ).length;
        if (enabledCount >= 3) {
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
            controlWarnings.push(
              `Node '${nodeName}': combined reduction exceeds 99% — residual risk may be unrealistically low`,
            );
            excessiveReductionWarned = true;
          }
        }
      }
    }

    // Progress
    if ((k + 1) % progressInterval === 0) {
      const pct = progressStart + Math.floor(((k + 1) / iterations) * progressRange);
      self.postMessage({ type: 'progress', percent: pct, iterationsComplete: k + 1 });
    }
  }

  if (cancelled) return null;

  const duration = performance.now() - startTime;

  // Compute summary stats
  const summary = computeStats(rootALEs, confidenceIntervals);
  // Store sorted samples (cap at 10K for exceedance curve)
  const sortedALE = [...rootALEs].sort((a, b) => a - b);
  const samples =
    sortedALE.length <= 10000
      ? sortedALE
      : sortedALE.filter((_, i) => i % Math.ceil(sortedALE.length / 10000) === 0);

  const perNode: SimulationResult['perNode'] = {};
  for (const id of nodeIds) {
    const lefs = perNodeLEFs.get(id)!;
    const stats = computeStats(lefs, confidenceIntervals);
    const tefs = perNodeTEFs.get(id)!;
    const vulns = perNodeVulns.get(id)!;
    perNode[id] = {
      meanLEF: stats.mean,
      meanTEF: tefs.length > 0 ? tefs.reduce((a, b) => a + b, 0) / tefs.length : undefined,
      meanVulnerability: vulns.length > 0 ? vulns.reduce((a, b) => a + b, 0) / vulns.length : undefined,
      percentiles: stats.percentiles,
    };
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
    samples,
  };

  // In single mode, post the result directly
  if (mode === 'single') {
    self.postMessage({ type: 'complete', result, rawALEValues: rootALEs });
  }

  return { result, rawALEValues: rootALEs };
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
