import { create } from 'zustand';
import type { SimulationResult } from '@shared/index';

export type ComparisonTab = 'controlled' | 'baseline' | 'compare';

export interface SimulationStore {
  isRunning: boolean;
  progress: number;
  results: SimulationResult | null;
  rawALEValues: number[] | null;
  baselineResults: SimulationResult | null;
  baselineRawALE: number[] | null;
  hasControls: boolean;
  activeTab: ComparisonTab;
  errors: string[] | null;
  resultsOutdated: boolean;

  setRunning: (running: boolean) => void;
  setProgress: (progress: number) => void;
  setResults: (
    results: SimulationResult,
    rawALEValues: number[],
    baselineResults?: SimulationResult,
    baselineRawALE?: number[],
  ) => void;
  setErrors: (errors: string[]) => void;
  setActiveTab: (tab: ComparisonTab) => void;
  markOutdated: () => void;
  clear: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  isRunning: false,
  progress: 0,
  results: null,
  rawALEValues: null,
  baselineResults: null,
  baselineRawALE: null,
  hasControls: false,
  activeTab: 'controlled',
  errors: null,
  resultsOutdated: false,

  setRunning: (running) => set({ isRunning: running, errors: null }),
  setProgress: (progress) => set({ progress }),
  setResults: (results, rawALEValues, baselineResults, baselineRawALE) =>
    set({
      results,
      rawALEValues,
      baselineResults: baselineResults ?? null,
      baselineRawALE: baselineRawALE ?? null,
      hasControls: !!baselineResults,
      activeTab: 'controlled',
      isRunning: false,
      progress: 100,
      resultsOutdated: false,
    }),
  setErrors: (errors) => set({ errors, isRunning: false, progress: 0 }),
  setActiveTab: (activeTab) => set({ activeTab }),
  markOutdated: () => set((state) => (state.results ? { resultsOutdated: true } : {})),
  clear: () =>
    set({
      results: null,
      rawALEValues: null,
      baselineResults: null,
      baselineRawALE: null,
      hasControls: false,
      activeTab: 'controlled',
      errors: null,
      progress: 0,
      resultsOutdated: false,
    }),
}));
