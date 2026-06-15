import { validateScenario } from '../src/workers/fairEngine.ts';
import {
  runSimulationSync,
  SimulationValidationError,
} from '../src/workers/simulationRunner.ts';
import { runControlToggle, runOATSweep } from '../src/workers/sensitivityEngine.ts';
import type {
  TestCase,
  CaseResult,
  BoundCheck,
  Range,
  SimulationBounds,
  SensitivityBounds,
  CLIOptions,
  Scenario,
} from './types.ts';

export function runTestCase(testCase: TestCase, file: string, options: CLIOptions): CaseResult {
  const start = performance.now();

  // Apply overrides
  const scenario: Scenario = {
    ...testCase.scenario,
    simulationConfig: {
      ...testCase.scenario.simulationConfig,
      ...testCase.simulationConfigOverride,
      ...(options.iterations != null ? { iterations: options.iterations } : {}),
      ...(options.seed != null ? { seed: options.seed } : {}),
    },
  };

  // Error test case
  if (testCase.expectedErrors) {
    return runErrorTestCase(testCase, scenario, file, start);
  }

  // Simulation test case
  try {
    const controls = testCase.controls ?? [];
    const runnerResult = runSimulationSync(scenario, controls);
    const duration = performance.now() - start;

    const result: CaseResult = {
      file,
      name: testCase.name,
      status: 'pass',
      duration,
      simulation: {
        mean: runnerResult.result.summary.mean,
        stddev: runnerResult.result.summary.stddev,
        percentiles: runnerResult.result.summary.percentiles,
        iterations: runnerResult.result.iterations,
        perNode: runnerResult.result.perNode,
      },
      warnings: runnerResult.result.controlWarnings,
    };

    if (runnerResult.baselineResult) {
      result.baseline = {
        mean: runnerResult.baselineResult.summary.mean,
        stddev: runnerResult.baselineResult.summary.stddev,
        percentiles: runnerResult.baselineResult.summary.percentiles,
        iterations: runnerResult.baselineResult.iterations,
        perNode: runnerResult.baselineResult.perNode,
      };
    }

    // Run sensitivity if configured
    if (testCase.sensitivity) {
      const seed = scenario.simulationConfig.seed ?? 42;
      if (testCase.sensitivity.controlToggle) {
        result.sensitivity = runControlToggle(scenario, controls, seed);
      } else if (testCase.sensitivity.oatSweep) {
        result.sensitivity = runOATSweep(scenario, controls, seed);
      }
    }

    // Validate bounds if in validation mode
    if (options.mode === 'validation' && testCase.expected) {
      const bounds: BoundCheck[] = [];
      const failures: string[] = [];

      if (testCase.expected.simulation) {
        checkSimulationBounds(
          testCase.expected.simulation,
          runnerResult.result,
          'simulation',
          bounds,
          failures,
        );
      }

      if (testCase.expected.baseline && runnerResult.baselineResult) {
        checkSimulationBounds(
          testCase.expected.baseline,
          runnerResult.baselineResult,
          'baseline',
          bounds,
          failures,
        );
      }

      if (testCase.expected.sensitivity && result.sensitivity) {
        checkSensitivityBounds(
          testCase.expected.sensitivity,
          result.sensitivity,
          bounds,
          failures,
        );
      }

      result.bounds = bounds;
      if (failures.length > 0) {
        result.status = 'fail';
        result.failures = failures;
      }
    }

    // Strict mode: treat warnings as failures
    if (options.strict && result.warnings && result.warnings.length > 0) {
      result.status = 'fail';
      result.failures = [
        ...(result.failures ?? []),
        ...result.warnings.map((w) => `[strict] ${w}`),
      ];
    }

    return result;
  } catch (err) {
    const duration = performance.now() - start;
    if (err instanceof SimulationValidationError) {
      return {
        file,
        name: testCase.name,
        status: 'error',
        duration,
        errors: err.errors,
      };
    }
    return {
      file,
      name: testCase.name,
      status: 'error',
      duration,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

function runErrorTestCase(
  testCase: TestCase,
  scenario: Scenario,
  file: string,
  start: number,
): CaseResult {
  const { nodes, edges, simulationConfig, lossMagnitude } = scenario;
  const actualErrors = validateScenario(nodes, edges, simulationConfig, lossMagnitude);
  const duration = performance.now() - start;

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const expected of testCase.expectedErrors!) {
    const found = actualErrors.some((actual) => actual.includes(expected));
    if (found) {
      matched.push(expected);
    } else {
      unmatched.push(expected);
    }
  }

  if (unmatched.length > 0) {
    return {
      file,
      name: testCase.name,
      status: 'fail',
      duration,
      failures: unmatched.map(
        (e) => `Expected error not found: "${e}" (actual: [${actualErrors.join(', ')}])`,
      ),
    };
  }

  return {
    file,
    name: testCase.name,
    status: 'pass',
    duration,
  };
}

function checkRange(
  field: string,
  actual: number,
  range: Range,
  bounds: BoundCheck[],
  failures: string[],
): void {
  const pass = actual >= range.min && actual <= range.max;
  bounds.push({ field, actual, min: range.min, max: range.max, pass });
  if (!pass) {
    failures.push(
      `${field}: ${actual.toFixed(2)} is outside expected range [${range.min}, ${range.max}]`,
    );
  }
}

function checkSimulationBounds(
  expected: SimulationBounds,
  result: { summary: { mean: number; stddev: number; percentiles: Record<number, number> }; perNode: Record<string, { meanLEF: number; meanTEF?: number; meanVulnerability?: number }> },
  prefix: string,
  bounds: BoundCheck[],
  failures: string[],
): void {
  if (expected.mean) {
    checkRange(`${prefix}.mean`, result.summary.mean, expected.mean, bounds, failures);
  }
  if (expected.stddev) {
    checkRange(`${prefix}.stddev`, result.summary.stddev, expected.stddev, bounds, failures);
  }
  if (expected.percentiles) {
    for (const [p, range] of Object.entries(expected.percentiles)) {
      const pNum = parseFloat(p);
      const actual = result.summary.percentiles[pNum];
      if (actual !== undefined) {
        checkRange(`${prefix}.p${p}`, actual, range, bounds, failures);
      }
    }
  }
  if (expected.perNode) {
    for (const [nodeId, nodeBounds] of Object.entries(expected.perNode)) {
      const nodeResult = result.perNode[nodeId];
      if (!nodeResult) continue;
      if (nodeBounds.meanLEF) {
        checkRange(`${prefix}.${nodeId}.meanLEF`, nodeResult.meanLEF, nodeBounds.meanLEF, bounds, failures);
      }
      if (nodeBounds.meanTEF && nodeResult.meanTEF !== undefined) {
        checkRange(`${prefix}.${nodeId}.meanTEF`, nodeResult.meanTEF, nodeBounds.meanTEF, bounds, failures);
      }
      if (nodeBounds.meanVulnerability && nodeResult.meanVulnerability !== undefined) {
        checkRange(`${prefix}.${nodeId}.meanVuln`, nodeResult.meanVulnerability, nodeBounds.meanVulnerability, bounds, failures);
      }
    }
  }
}

function checkSensitivityBounds(
  expected: SensitivityBounds,
  result: { type: string; baselineALE: number; items: Array<{ id: string; delta: number }> },
  bounds: BoundCheck[],
  failures: string[],
): void {
  const section = result.type === 'controlToggle' ? expected.controlToggle : expected.oatSweep;
  if (!section) return;

  if (section.baselineALE) {
    checkRange('sensitivity.baselineALE', result.baselineALE, section.baselineALE, bounds, failures);
  }

  if (section.items) {
    for (const [itemId, itemBounds] of Object.entries(section.items)) {
      const item = result.items.find((i) => i.id === itemId);
      if (!item) continue;
      if (itemBounds.delta) {
        checkRange(`sensitivity.${itemId}.delta`, item.delta, itemBounds.delta, bounds, failures);
      }
    }
  }
}
