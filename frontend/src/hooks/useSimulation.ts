import { useCallback, useEffect, useRef } from 'react';
import type { Scenario, SimulationResult } from '@shared/index';
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
}

interface WorkerErrorMessage {
  type: 'error';
  errors: string[];
}

type WorkerOutMessage = WorkerProgressMessage | WorkerCompleteMessage | WorkerErrorMessage;

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const { isRunning, progress, results, errors, rawALEValues, resultsOutdated } =
    useSimulationStore();
  const { setRunning, setProgress, setResults, setErrors } = useSimulationStore();

  const run = useCallback(
    (scenario: Scenario) => {
      // Terminate existing worker
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      setRunning(true);
      setProgress(0);

      const worker = new Worker(
        new URL('../workers/simulation.worker.ts', import.meta.url),
        { type: 'module' },
      );

      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'progress':
            setProgress(msg.percent);
            break;
          case 'complete':
            setResults(msg.result, msg.rawALEValues);
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

      worker.postMessage({ type: 'start', scenario });
    },
    [setRunning, setProgress, setResults, setErrors],
  );

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      // Force terminate after 100ms if still running
      const w = workerRef.current;
      setTimeout(() => {
        w.terminate();
      }, 100);
      workerRef.current = null;
      setRunning(false);
      setProgress(0);
    }
  }, [setRunning, setProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return { run, cancel, isRunning, progress, results, errors, rawALEValues, resultsOutdated };
}
