import type { Scenario, Control } from '@shared/index';
import {
  runSimulationSync,
  SimulationValidationError,
  SimulationCancelledError,
} from './simulationRunner';
import {
  runControlToggle,
  runOATSweep,
  runControlBidirectional,
  runShapleyAttribution,
} from './sensitivityEngine';

interface SimulationRequest {
  type: 'start';
  scenario: Scenario;
  controls?: Control[];
}

interface SensitivityRequest {
  type: 'sensitivity';
  sensitivityType: 'controlToggle' | 'oatSweep' | 'controlBidirectional' | 'shapley';
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

  // F-03: Sensitivity analysis with wall-clock timeout (120s)
  if (e.data.type === 'sensitivity') {
    cancelled = false;
    const { sensitivityType, scenario, controls, seed } = e.data;
    const engines = {
      controlToggle: runControlToggle,
      oatSweep: runOATSweep,
      controlBidirectional: runControlBidirectional,
      shapley: runShapleyAttribution,
    } as const;
    const engine = engines[sensitivityType];
    const sensitivityStart = performance.now();
    const result = engine(scenario, controls, seed, (completed, total) => {
      if (cancelled) return;
      if (performance.now() - sensitivityStart > 120_000) {
        cancelled = true;
        self.postMessage({
          type: 'error',
          errors: ['Sensitivity analysis timed out after 120 seconds'],
        });
        return;
      }
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
    const startTime = performance.now();

    try {
      const runnerResult = runSimulationSync(scenario, controls, {
        onProgress: (percent, iterationsComplete) => {
          self.postMessage({ type: 'progress', percent, iterationsComplete });
        },
        isCancelled: () => cancelled,
        getElapsed: () => performance.now() - startTime,
      });

      if (!cancelled) {
        self.postMessage({
          type: 'complete',
          result: runnerResult.result,
          rawALEValues: runnerResult.rawALEValues,
          baselineResult: runnerResult.baselineResult,
          baselineRawALE: runnerResult.baselineRawALE,
        });
      }
    } catch (err) {
      if (err instanceof SimulationCancelledError) {
        return;
      }
      if (err instanceof SimulationValidationError) {
        self.postMessage({ type: 'error', errors: err.errors });
        return;
      }
      self.postMessage({
        type: 'error',
        errors: [err instanceof Error ? err.message : 'Unknown simulation error'],
      });
    }
  }
};
