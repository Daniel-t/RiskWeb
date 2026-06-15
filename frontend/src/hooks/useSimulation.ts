import { useCallback, useEffect, useRef } from 'react';
import type {
  Scenario,
  SimulationResult,
  SensitivityResult,
  ControlImpactResult,
  ShapleyResult,
  Control,
} from '@shared/index';
import { useSimulationStore } from '../store/simulationStore';

interface WorkerProgressMessage {
  type: 'progress';
  percent: number;
  iterationsComplete: number;
}

interface WorkerCompleteMessage {
  type: 'complete';
  result: SimulationResult;
  rawALEValues: number[];
  baselineResult?: SimulationResult;
  baselineRawALE?: number[];
}

interface WorkerErrorMessage {
  type: 'error';
  errors: string[];
}

interface WorkerSensitivityProgressMessage {
  type: 'sensitivityProgress';
  percent: number;
}

interface WorkerSensitivityCompleteMessage {
  type: 'sensitivityComplete';
  result: SensitivityResult | ControlImpactResult | ShapleyResult;
}

type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerCompleteMessage
  | WorkerErrorMessage
  | WorkerSensitivityProgressMessage
  | WorkerSensitivityCompleteMessage;

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const { isRunning, progress, results, errors, rawALEValues, resultsOutdated } =
    useSimulationStore();
  const { setRunning, setProgress, setResults, setErrors } = useSimulationStore();
  const {
    sensitivityRunning,
    sensitivityProgress,
    setSensitivityResult,
    setControlImpactResult,
    setShapleyResult,
    setSensitivityRunning,
    setSensitivityProgress,
  } = useSimulationStore();

  const createWorker = useCallback(() => {
    return new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
      type: 'module',
    });
  }, []);

  const run = useCallback(
    (scenario: Scenario, controls: Control[] = []) => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      setRunning(true);
      setProgress(0);

      const worker = createWorker();
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'progress':
            setProgress(msg.percent);
            break;
          case 'complete':
            setResults(msg.result, msg.rawALEValues, msg.baselineResult, msg.baselineRawALE);
            worker.terminate();
            workerRef.current = null;
            break;
          case 'error':
            setErrors(msg.errors);
            worker.terminate();
            workerRef.current = null;
            break;
        }
      };

      worker.onerror = () => {
        setErrors(['Simulation worker crashed unexpectedly']);
        worker.terminate();
        workerRef.current = null;
      };

      worker.postMessage({ type: 'start', scenario, controls });
    },
    [createWorker, setRunning, setProgress, setResults, setErrors],
  );

  const runSensitivity = useCallback(
    (
      scenario: Scenario,
      controls: Control[],
      sensitivityType: 'controlToggle' | 'oatSweep' | 'controlBidirectional' | 'shapley',
    ) => {
      // Use a separate worker for sensitivity so it doesn't conflict
      const worker = createWorker();
      setSensitivityRunning(true);
      setSensitivityProgress(0);

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'sensitivityProgress':
            setSensitivityProgress(msg.percent);
            break;
          case 'sensitivityComplete':
            if (msg.result.type === 'controlBidirectional') {
              setControlImpactResult(msg.result as ControlImpactResult);
            } else if (msg.result.type === 'shapley') {
              setShapleyResult(msg.result as ShapleyResult);
            } else {
              setSensitivityResult(msg.result as SensitivityResult);
            }
            setSensitivityRunning(false);
            worker.terminate();
            break;
        }
      };

      worker.onerror = () => {
        setSensitivityRunning(false);
        worker.terminate();
      };

      const seed = scenario.simulationConfig.seed ?? Math.floor(Math.random() * 2 ** 32);
      worker.postMessage({ type: 'sensitivity', sensitivityType, scenario, controls, seed });
    },
    [
      createWorker,
      setSensitivityRunning,
      setSensitivityProgress,
      setSensitivityResult,
      setControlImpactResult,
      setShapleyResult,
    ],
  );

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      const w = workerRef.current;
      setTimeout(() => {
        w.terminate();
      }, 100);
      workerRef.current = null;
      setRunning(false);
      setProgress(0);
    }
  }, [setRunning, setProgress]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return {
    run,
    runSensitivity,
    cancel,
    isRunning,
    progress,
    results,
    errors,
    rawALEValues,
    resultsOutdated,
    sensitivityRunning,
    sensitivityProgress,
  };
}
