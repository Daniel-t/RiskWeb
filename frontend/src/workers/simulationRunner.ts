import type {
  Scenario,
  SimulationResult,
  Control,
  ControlAssignment,
} from '@shared/index';
import { topologicalSort, evaluateTree, validateScenario, applyLmReductions } from './fairEngine';
import { sampleDistribution } from './distributions';
import { mulberry32 } from './prng';

export interface RunnerResult {
  result: SimulationResult;
  rawALEValues: number[];
  baselineResult?: SimulationResult;
  baselineRawALE?: number[];
}

export interface RunnerCallbacks {
  onProgress?: (percent: number, iterationsComplete: number) => void;
  isCancelled?: () => boolean;
  getElapsed?: () => number;
}

/**
 * Run a full simulation (with optional dual-pass for controls).
 * Pure function — no Web Worker APIs, no side effects.
 * Returns null if validation fails; throws with error messages.
 */
export function runSimulationSync(
  scenario: Scenario,
  controls: Control[] = [],
  callbacks?: RunnerCallbacks,
): RunnerResult {
  const hasEnabledAssignments =
    (scenario.controlAssignments ?? []).some((a) => a.enabled) && controls.length > 0;

  if (hasEnabledAssignments) {
    return runDualPass(scenario, controls, callbacks);
  } else {
    return runSinglePass(scenario, controls, callbacks, 0, 100);
  }
}

function runDualPass(
  scenario: Scenario,
  controls: Control[],
  callbacks?: RunnerCallbacks,
): RunnerResult {
  // Pass 1: Baseline (no control reductions)
  const baselineScenario: Scenario = {
    ...scenario,
    controlAssignments: undefined,
  };
  const baseline = runSinglePass(baselineScenario, [], callbacks, 0, 50);

  // Pass 2: Controlled (with control reductions, same seed)
  const controlled = runSinglePass(scenario, controls, callbacks, 50, 100);

  return {
    result: controlled.result,
    rawALEValues: controlled.rawALEValues,
    baselineResult: baseline.result,
    baselineRawALE: baseline.rawALEValues,
  };
}

function runSinglePass(
  scenario: Scenario,
  controls: Control[],
  callbacks: RunnerCallbacks | undefined,
  progressStart: number,
  progressEnd: number,
): RunnerResult {
  const { nodes, edges, simulationConfig, controlAssignments } = scenario;
  const { iterations, seed, confidenceIntervals } = simulationConfig;

  // Detect v2: find outcome node for LM, fall back to scenario-level
  const outcomeNode = nodes.find((n) => n.type === 'outcome');
  const lossMagnitude = outcomeNode?.lossMagnitude ?? scenario.lossMagnitude;

  // Validate
  const errors = validateScenario(nodes, edges, simulationConfig, lossMagnitude);
  if (errors.length > 0) {
    throw new SimulationValidationError(errors);
  }

  // Initialize PRNG
  const rng = seed != null ? mulberry32(seed) : Math.random.bind(Math);

  // Topological sort
  let sortedOrder: string[];
  try {
    sortedOrder = topologicalSort(nodes, edges);
  } catch {
    throw new SimulationValidationError(['Tree contains a cycle']);
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
      const existing = nodeAssignments.get(a.nodeId) ?? [];
      existing.push(a);
      nodeAssignments.set(a.nodeId, existing);

      const ctrl = controlMap.get(a.controlId)!;
      if (ctrl.lmReduction) {
        lmAssignments.push(a);
      }
    }
  }

  // Find root: outcome node (v2) or last in sorted order (v1)
  const rootId = outcomeNode?.id ?? sortedOrder[sortedOrder.length - 1];

  const progressInterval = Math.max(1, Math.floor(iterations / 100));
  const progressRange = progressEnd - progressStart;

  // Per-node accumulators
  const nodeIds = nodes.map((n) => n.id);
  const perNodeValues = new Map<string, number[]>();
  const perNodeDomains = new Map<string, string>();
  const perNodeTEFs = new Map<string, number[]>();
  for (const id of nodeIds) {
    perNodeValues.set(id, []);
    perNodeTEFs.set(id, []);
  }

  const rootALEs: number[] = [];
  const startTime = performance.now();
  let excessiveReductionWarned = false;

  for (let k = 0; k < iterations; k++) {
    if (k % progressInterval === 0) {
      if (callbacks?.isCancelled?.()) {
        throw new SimulationCancelledError();
      }
      const elapsed = callbacks?.getElapsed?.() ?? (performance.now() - startTime);
      if (elapsed > 120_000) {
        throw new SimulationValidationError(['Simulation timed out after 120 seconds']);
      }
    }

    const iterResult = evaluateTree(nodes, edges, sortedOrder, rng, nodeAssignments, controlMap);

    // Sample LM and apply reductions
    const baseLm = sampleDistribution(lossMagnitude!, rng);
    const lm = applyLmReductions(baseLm, lmAssignments, controlMap, rng);

    // Root LEF (value field in new model, lef field for compat)
    const rootResult = iterResult.get(rootId)!;
    const rootLEF = rootResult.lef ?? rootResult.value;
    const ale = rootLEF * lm;
    rootALEs.push(isFinite(ale) ? ale : 0);

    // Accumulate per-node values
    for (const id of nodeIds) {
      const nr = iterResult.get(id)!;
      perNodeValues.get(id)!.push(nr.value);
      if (k === 0) perNodeDomains.set(id, nr.domain);
      if (nr.tef !== undefined) perNodeTEFs.get(id)!.push(nr.tef);
    }

    // Excessive reduction warning (first iteration only)
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

    if ((k + 1) % progressInterval === 0) {
      const pct = progressStart + Math.floor(((k + 1) / iterations) * progressRange);
      callbacks?.onProgress?.(pct, k + 1);
    }
  }

  if (callbacks?.isCancelled?.()) {
    throw new SimulationCancelledError();
  }

  const duration = performance.now() - startTime;

  const summary = computeStats(rootALEs, confidenceIntervals);
  const sortedALE = [...rootALEs].sort((a, b) => a - b);
  const samples =
    sortedALE.length <= 10000
      ? sortedALE
      : sortedALE.filter((_, i) => i % Math.ceil(sortedALE.length / 10000) === 0);

  const perNode: SimulationResult['perNode'] = {};
  for (const id of nodeIds) {
    const values = perNodeValues.get(id)!;
    const stats = computeStats(values, confidenceIntervals);
    const tefs = perNodeTEFs.get(id)!;
    const domain = perNodeDomains.get(id) as 'frequency' | 'probability' | undefined;

    perNode[id] = {
      meanLEF: domain === 'frequency' ? stats.mean : stats.mean,
      meanTEF: tefs.length > 0 ? tefs.reduce((a, b) => a + b, 0) / tefs.length : undefined,
      meanProbability: domain === 'probability' ? stats.mean : undefined,
      domain,
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

  return { result, rawALEValues: rootALEs };
}

export function computeStats(
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

export class SimulationValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join('; '));
    this.name = 'SimulationValidationError';
    this.errors = errors;
  }
}

export class SimulationCancelledError extends Error {
  constructor() {
    super('Simulation cancelled');
    this.name = 'SimulationCancelledError';
  }
}
