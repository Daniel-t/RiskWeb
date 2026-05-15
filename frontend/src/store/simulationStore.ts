import { create } from 'zustand';
import type { SimulationResult } from '@shared/index';

export interface SimulationStore {
  isRunning: boolean;
  progress: number;
  results: SimulationResult | null;
  rawALEValues: number[] | null;
  errors: string[] | null;
  resultsOutdated: boolean;

  setRunning: (running: boolean) => void;
  setProgress: (progress: number) => void;
  setResults: (results: SimulationResult, rawALEValues: number[]) => void;
  setErrors: (errors: string[]) => void;
  markOutdated: () => void;
  clear: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  isRunning: false,
  progress: 0,
  results: null,
  rawALEValues: null,
  errors: null,
  resultsOutdated: false,

  setRunning: (running) => set({ isRunning: running, errors: null }),
  setProgress: (progress) => set({ progress }),
  setResults: (results, rawALEValues) =>
    set({ results, rawALEValues, isRunning: false, progress: 100, resultsOutdated: false }),
  setErrors: (errors) => set({ errors, isRunning: false, progress: 0 }),
  markOutdated: () =>
    set((state) => (state.results ? { resultsOutdated: true } : {})),
  clear: () =>
    set({ results: null, rawALEValues: null, errors: null, progress: 0, resultsOutdated: false }),
}));
