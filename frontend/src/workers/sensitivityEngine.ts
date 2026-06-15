import type {
  Scenario,
  Control,
  Distribution,
  SensitivityItem,
  SensitivityResult,
  ControlAssignment,
} from '@shared/index';
import { topologicalSort, evaluateTree, applyLmReductions } from './fairEngine';
import { sampleDistribution } from './distributions';
import { mulberry32 } from './prng';

export function getExpectedValue(dist: Distribution): number {
  switch (dist.type) {
    case 'pert':
      return (dist.params.min + 4 * dist.params.mode + dist.params.max) / 6;
    case 'lognormal':
      return Math.exp(dist.params.mu + dist.params.sigma ** 2 / 2);
    case 'constant':
      return dist.params.value;
  }
}

function erfInv(x: number): number {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const t1 = 2 / (Math.PI * a) + ln / 2;
  const t2 = ln / a;
  return Math.sign(x) * Math.sqrt(Math.sqrt(t1 * t1 - t2) - t1);
}

function normalQuantile(p: number): number {
  return Math.SQRT2 * erfInv(2 * p - 1);
}

export function getPercentile(dist: Distribution, p: number): number {
  switch (dist.type) {
    case 'constant':
      return dist.params.value;
    case 'lognormal':
      return Math.exp(dist.params.mu + dist.params.sigma * normalQuantile(p));
    case 'pert': {
      const { min, mode, max } = dist.params;
      if (min === max) return min;
      const lambda = 4;
      const range = max - min;
      const alpha = 1 + (lambda * (mode - min)) / range;
      const beta = 1 + (lambda * (max - mode)) / range;
      const bq = betaQuantile(p, alpha, beta);
      if (!isFinite(bq)) {
        return min + p * range;
      }
      return min + bq * range;
    }
  }
}

function betaQuantile(p: number, a: number, b: number): number {
  // Newton's method approximation for beta inverse CDF
  let x = (a - 1) / (a + b - 2);
  if (!isFinite(x) || x <= 0 || x >= 1) x = 0.5;

  for (let i = 0; i < 50; i++) {
    const cdf = betaCDF(x, a, b);
    const pdf = betaPDF(x, a, b);
    if (!isFinite(cdf) || !isFinite(pdf) || pdf < 1e-15) break;
    const dx = (cdf - p) / pdf;
    if (!isFinite(dx)) break;
    x = Math.max(1e-10, Math.min(1 - 1e-10, x - dx));
    if (Math.abs(dx) < 1e-12) break;
  }
  return isFinite(x) ? x : p;
}

function betaPDF(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logBeta(a, b));
}

function betaCDF(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return regularizedBetaIncomplete(x, a, b);
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logGamma(x: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) {
    a += c[i] / (x + i);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function regularizedBetaIncomplete(x: number, a: number, b: number): number {
  // Continued fraction (Lentz's method)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedBetaIncomplete(1 - x, b, a);
  }
  const lnPfx = a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b) - Math.log(a);
  const pfx = Math.exp(lnPfx);

  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= 200; m++) {
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    result *= d * c;

    num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + num * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + num / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }

  return pfx * a * result;
}

// ── Control Toggle Analysis ─────────────────────────────────────────────

function runQuickSimulation(
  scenario: Scenario,
  controls: Control[],
  seed: number,
  iterations: number,
): number {
  const { nodes, edges } = scenario;
  const outcomeNode = nodes.find((n) => n.type === 'outcome');
  const lossMagnitude = outcomeNode?.lossMagnitude ?? scenario.lossMagnitude;
  const rng = mulberry32(seed);
  const sortedOrder = topologicalSort(nodes, edges);

  const controlMap = new Map<string, Control>();
  for (const c of controls) controlMap.set(c.id, c);

  const nodeAssignments = new Map<string, ControlAssignment[]>();
  const lmAssignments: ControlAssignment[] = [];

  if (scenario.controlAssignments) {
    for (const a of scenario.controlAssignments) {
      if (!controlMap.has(a.controlId)) continue;
      const existing = nodeAssignments.get(a.nodeId) ?? [];
      existing.push(a);
      nodeAssignments.set(a.nodeId, existing);
      const ctrl = controlMap.get(a.controlId)!;
      if (ctrl.lmReduction) lmAssignments.push(a);
    }
  }

  const rootId = outcomeNode?.id ?? sortedOrder[sortedOrder.length - 1];
  let sum = 0;

  for (let k = 0; k < iterations; k++) {
    const iterResult = evaluateTree(nodes, edges, sortedOrder, rng, nodeAssignments, controlMap);
    const baseLm = sampleDistribution(lossMagnitude!, rng);
    const lm = applyLmReductions(baseLm, lmAssignments, controlMap, rng);
    const rootResult = iterResult.get(rootId)!;
    const rootLEF = rootResult.lef ?? rootResult.value;
    const ale = rootLEF * lm;
    sum += isFinite(ale) ? ale : 0;
  }

  return sum / iterations;
}

export function runControlToggle(
  scenario: Scenario,
  controls: Control[],
  seed: number,
  onProgress?: (completed: number, total: number) => void,
): SensitivityResult {
  const startTime = performance.now();
  const iterations = Math.max(1000, Math.min(scenario.simulationConfig.iterations, 10000));

  // Find unique controls that are assigned and enabled
  const assignedControlIds = new Set(
    (scenario.controlAssignments ?? []).filter((a) => a.enabled).map((a) => a.controlId),
  );
  const assignedControls = controls.filter((c) => assignedControlIds.has(c.id));
  const total = assignedControls.length + 1;

  // Baseline: all controls on
  const baselineALE = runQuickSimulation(scenario, controls, seed, iterations);
  onProgress?.(1, total);

  const items: SensitivityItem[] = [];

  // Toggle each control off
  for (let i = 0; i < assignedControls.length; i++) {
    const toggledControl = assignedControls[i];

    // Disable this control's assignments
    const modifiedScenario: Scenario = {
      ...scenario,
      controlAssignments: (scenario.controlAssignments ?? []).map((a) =>
        a.controlId === toggledControl.id ? { ...a, enabled: false } : a,
      ),
    };

    const toggledALE = runQuickSimulation(modifiedScenario, controls, seed, iterations);
    const delta = toggledALE - baselineALE;

    items.push({
      id: toggledControl.id,
      label: toggledControl.name,
      category: 'control',
      aleLow: baselineALE,
      aleHigh: toggledALE,
      delta,
    });

    onProgress?.(i + 2, total);
  }

  // Sort by delta descending
  items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    type: 'controlToggle',
    baselineALE,
    items,
    duration: performance.now() - startTime,
  };
}

// ── OAT Sweep Analysis ─────────────────────────────────────────────────

interface InputDescriptor {
  id: string;
  label: string;
  category: SensitivityItem['category'];
  getP10: () => number;
  getP90: () => number;
  getExpected: () => number;
  apply: (scenario: Scenario, value: number) => Scenario;
}

function collectInputDescriptors(scenario: Scenario, controls: Control[]): InputDescriptor[] {
  const descriptors: InputDescriptor[] = [];
  const controlMap = new Map<string, Control>();
  for (const c of controls) controlMap.set(c.id, c);
  const isV2 = scenario.nodes.some((n) => n.type === 'outcome');

  if (isV2) {
    // v2: LM from outcome node
    const outcomeNode = scenario.nodes.find((n) => n.type === 'outcome');
    if (outcomeNode?.lossMagnitude) {
      const lm = outcomeNode.lossMagnitude;
      descriptors.push({
        id: 'scenario-lm',
        label: `${outcomeNode.label} > LM`,
        category: 'lm',
        getP10: () => getPercentile(lm, 0.1),
        getP90: () => getPercentile(lm, 0.9),
        getExpected: () => getExpectedValue(lm),
        apply: (s, value) => ({
          ...s,
          nodes: s.nodes.map((n) =>
            n.id === outcomeNode.id
              ? { ...n, lossMagnitude: { type: 'constant' as const, params: { value } } }
              : n,
          ),
        }),
      });
    }

    // v2: event nodes (TEF)
    for (const node of scenario.nodes) {
      if (node.type === 'event') {
        const tefDist = node.tef ?? node.fairInputs?.lef;
        if (tefDist) {
          descriptors.push({
            id: `${node.id}-tef`,
            label: `${node.label} > TEF`,
            category: 'tef',
            getP10: () => getPercentile(tefDist, 0.1),
            getP90: () => getPercentile(tefDist, 0.9),
            getExpected: () => getExpectedValue(tefDist),
            apply: (s, value) => ({
              ...s,
              nodes: s.nodes.map((n) =>
                n.id === node.id
                  ? { ...n, tef: { type: 'constant' as const, params: { value } } }
                  : n,
              ),
            }),
          });
        }
      } else if (node.type === 'condition') {
        const probDist = node.probability ?? node.fairInputs?.vulnerability;
        if (probDist) {
          descriptors.push({
            id: `${node.id}-prob`,
            label: `${node.label} > Probability`,
            category: 'probability',
            getP10: () => getPercentile(probDist, 0.1),
            getP90: () => getPercentile(probDist, 0.9),
            getExpected: () => getExpectedValue(probDist),
            apply: (s, value) => ({
              ...s,
              nodes: s.nodes.map((n) =>
                n.id === node.id
                  ? { ...n, probability: { type: 'constant' as const, params: { value } } }
                  : n,
              ),
            }),
          });
        }
      }
    }
  } else {
    // v1: Scenario-level LM
    if (scenario.lossMagnitude) {
      const lm = scenario.lossMagnitude;
      descriptors.push({
        id: 'scenario-lm',
        label: 'Scenario LM',
        category: 'lm',
        getP10: () => getPercentile(lm, 0.1),
        getP90: () => getPercentile(lm, 0.9),
        getExpected: () => getExpectedValue(lm),
        apply: (s, value) => ({
          ...s,
          lossMagnitude: { type: 'constant' as const, params: { value } },
        }),
      });
    }

    // v1: leaf node inputs
    for (const node of scenario.nodes) {
      if (node.type !== 'leaf' || !node.fairInputs) continue;

      if (node.fairInputs.tef && node.fairInputs.vulnerability) {
        const tef = node.fairInputs.tef;
        const vuln = node.fairInputs.vulnerability;
        descriptors.push({
          id: `${node.id}-tef`,
          label: `${node.label} > TEF`,
          category: 'tef',
          getP10: () => getPercentile(tef, 0.1),
          getP90: () => getPercentile(tef, 0.9),
          getExpected: () => getExpectedValue(tef),
          apply: (s, value) => ({
            ...s,
            nodes: s.nodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    fairInputs: {
                      ...n.fairInputs!,
                      tef: { type: 'constant' as const, params: { value } },
                    },
                  }
                : n,
            ),
          }),
        });
        descriptors.push({
          id: `${node.id}-vuln`,
          label: `${node.label} > Vulnerability`,
          category: 'vulnerability',
          getP10: () => getPercentile(vuln, 0.1),
          getP90: () => getPercentile(vuln, 0.9),
          getExpected: () => getExpectedValue(vuln),
          apply: (s, value) => ({
            ...s,
            nodes: s.nodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    fairInputs: {
                      ...n.fairInputs!,
                      vulnerability: { type: 'constant' as const, params: { value } },
                    },
                  }
                : n,
            ),
          }),
        });
      } else {
        const lef = node.fairInputs.lef;
        descriptors.push({
          id: `${node.id}-lef`,
          label: `${node.label} > LEF`,
          category: 'lef',
          getP10: () => getPercentile(lef, 0.1),
          getP90: () => getPercentile(lef, 0.9),
          getExpected: () => getExpectedValue(lef),
          apply: (s, value) => ({
            ...s,
            nodes: s.nodes.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    fairInputs: {
                      ...n.fairInputs!,
                      lef: { type: 'constant' as const, params: { value } },
                    },
                  }
                : n,
            ),
          }),
        });
      }
    }
  }

  // Control reduction inputs (same for v1 and v2)
  const assignedControlIds = new Set(
    (scenario.controlAssignments ?? []).filter((a) => a.enabled).map((a) => a.controlId),
  );
  for (const ctrl of controls) {
    if (!assignedControlIds.has(ctrl.id)) continue;
    const lefRed = ctrl.lefReduction;
    descriptors.push({
      id: `${ctrl.id}-lefRed`,
      label: `${ctrl.name} > Reduction`,
      category: 'lefReduction',
      getP10: () => getPercentile(lefRed, 0.1),
      getP90: () => getPercentile(lefRed, 0.9),
      getExpected: () => getExpectedValue(lefRed),
      apply: (s, value) => ({
        ...s,
        controlAssignments: (s.controlAssignments ?? []).map((a) =>
          a.controlId === ctrl.id
            ? { ...a, lefReductionOverride: { type: 'constant' as const, params: { value } } }
            : a,
        ),
      }),
    });
    if (ctrl.lmReduction) {
      const lmRed = ctrl.lmReduction;
      descriptors.push({
        id: `${ctrl.id}-lmRed`,
        label: `${ctrl.name} > LM Reduction`,
        category: 'lmReduction',
        getP10: () => getPercentile(lmRed, 0.1),
        getP90: () => getPercentile(lmRed, 0.9),
        getExpected: () => getExpectedValue(lmRed),
        apply: (s, value) => ({
          ...s,
          controlAssignments: (s.controlAssignments ?? []).map((a) =>
            a.controlId === ctrl.id
              ? { ...a, lmReductionOverride: { type: 'constant' as const, params: { value } } }
              : a,
          ),
        }),
      });
    }
  }

  return descriptors;
}

function fixAllInputsAtExpected(scenario: Scenario, controls: Control[]): Scenario {
  let s = { ...scenario };
  const isV2 = s.nodes.some((n) => n.type === 'outcome');

  // Fix node inputs
  s = {
    ...s,
    nodes: s.nodes.map((n) => {
      if (isV2) {
        if (n.type === 'outcome' && n.lossMagnitude) {
          return {
            ...n,
            lossMagnitude: {
              type: 'constant' as const,
              params: { value: getExpectedValue(n.lossMagnitude) },
            },
          };
        }
        if (n.type === 'event') {
          const tefDist = n.tef ?? n.fairInputs?.lef;
          if (tefDist) {
            return {
              ...n,
              tef: { type: 'constant' as const, params: { value: getExpectedValue(tefDist) } },
            };
          }
        }
        if (n.type === 'condition') {
          const probDist = n.probability ?? n.fairInputs?.vulnerability;
          if (probDist) {
            return {
              ...n,
              probability: {
                type: 'constant' as const,
                params: { value: getExpectedValue(probDist) },
              },
            };
          }
        }
        return n;
      }

      // v1 path
      if (n.type === 'leaf' && n.fairInputs) {
        if (n.fairInputs.tef && n.fairInputs.vulnerability) {
          return {
            ...n,
            fairInputs: {
              lef: n.fairInputs.lef,
              tef: {
                type: 'constant' as const,
                params: { value: getExpectedValue(n.fairInputs.tef) },
              },
              vulnerability: {
                type: 'constant' as const,
                params: { value: getExpectedValue(n.fairInputs.vulnerability) },
              },
            },
          };
        }
        return {
          ...n,
          fairInputs: {
            lef: {
              type: 'constant' as const,
              params: { value: getExpectedValue(n.fairInputs.lef) },
            },
          },
        };
      }
      return n;
    }),
  };

  // Fix scenario-level LM (v1 only)
  if (!isV2 && s.lossMagnitude) {
    s = {
      ...s,
      lossMagnitude: { type: 'constant', params: { value: getExpectedValue(s.lossMagnitude) } },
    };
  }

  // Fix control reductions at expected
  const controlMap = new Map<string, Control>();
  for (const c of controls) controlMap.set(c.id, c);
  s = {
    ...s,
    controlAssignments: (s.controlAssignments ?? []).map((a) => {
      const ctrl = controlMap.get(a.controlId);
      if (!ctrl) return a;
      const fixed: typeof a = {
        ...a,
        lefReductionOverride: {
          type: 'constant' as const,
          params: { value: getExpectedValue(a.lefReductionOverride ?? ctrl.lefReduction) },
        },
      };
      if (ctrl.lmReduction) {
        fixed.lmReductionOverride = {
          type: 'constant' as const,
          params: { value: getExpectedValue(a.lmReductionOverride ?? ctrl.lmReduction) },
        };
      }
      return fixed;
    }),
  };

  return s;
}

export function runOATSweep(
  scenario: Scenario,
  controls: Control[],
  seed: number,
  onProgress?: (completed: number, total: number) => void,
): SensitivityResult {
  const startTime = performance.now();
  const iterations = 1000;

  const descriptors = collectInputDescriptors(scenario, controls);
  // Filter out constant inputs (no swing)
  const sweepable = descriptors.filter((d) => {
    const p10 = d.getP10();
    const p90 = d.getP90();
    if (!isFinite(p10) || !isFinite(p90)) {
      console.warn(`[OAT] Non-finite percentile for "${d.label}": p10=${p10}, p90=${p90}`);
      return false;
    }
    return Math.abs(p90 - p10) > 1e-12;
  });

  const total = sweepable.length * 2;
  const baseScenario = fixAllInputsAtExpected(scenario, controls);
  const baselineALE = runQuickSimulation(baseScenario, controls, seed, iterations);

  const items: SensitivityItem[] = [];

  for (let i = 0; i < sweepable.length; i++) {
    const desc = sweepable[i];
    const p10 = desc.getP10();
    const p90 = desc.getP90();
    const expected = desc.getExpected();

    // Sweep low (P10)
    const lowScenario = desc.apply(baseScenario, p10);
    const aleLow = runQuickSimulation(lowScenario, controls, seed, iterations);
    onProgress?.(i * 2 + 1, total);

    // Sweep high (P90)
    const highScenario = desc.apply(baseScenario, p90);
    const aleHigh = runQuickSimulation(highScenario, controls, seed, iterations);
    onProgress?.(i * 2 + 2, total);

    items.push({
      id: desc.id,
      label: desc.label,
      category: desc.category,
      aleLow,
      aleHigh,
      delta: aleHigh - aleLow,
      inputLow: p10,
      inputHigh: p90,
      inputExpected: expected,
    });
  }

  // Sort by swing descending
  items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    type: 'oatSweep',
    baselineALE,
    items,
    duration: performance.now() - startTime,
  };
}
