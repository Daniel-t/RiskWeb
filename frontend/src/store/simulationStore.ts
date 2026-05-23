import { create } from 'zustand';
import type { SimulationResult, SensitivityResult, Scenario } from '@shared/index';

export type ComparisonTab = 'controlled' | 'baseline' | 'compare';
export type ActiveView = 'distribution' | 'exceedance' | 'sensitivity';

export interface SimulationStore {
  isRunning: boolean;
  progress: number;
  results: SimulationResult | null;
  rawALEValues: number[] | null;
  baselineResults: SimulationResult | null;
  baselineRawALE: number[] | null;
  hasControls: boolean;
  activeTab: ComparisonTab;
  activeView: ActiveView;
  errors: string[] | null;
  resultsOutdated: boolean;

  // Sensitivity
  sensitivityResult: SensitivityResult | null;
  sensitivityRunning: boolean;
  sensitivityProgress: number;

  // Scenario comparison
  comparisonScenarios: Scenario[] | null;
  comparisonReferenceId: string | null;

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
  setActiveView: (view: ActiveView) => void;
  markOutdated: () => void;
  clear: () => void;

  // Sensitivity actions
  setSensitivityResult: (result: SensitivityResult) => void;
  setSensitivityRunning: (running: boolean) => void;
  setSensitivityProgress: (progress: number) => void;
  clearSensitivity: () => void;

  // Comparison actions
  setComparison: (scenarios: Scenario[], referenceId: string) => void;
  clearComparison: () => void;
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
  activeView: 'distribution',
  errors: null,
  resultsOutdated: false,

  sensitivityResult: null,
  sensitivityRunning: false,
  sensitivityProgress: 0,

  comparisonScenarios: null,
  comparisonReferenceId: null,

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
  setActiveView: (activeView) => set({ activeView }),
  markOutdated: () => set((state) => (state.results ? { resultsOutdated: true } : {})),
  clear: () =>
    set({
      results: null,
      rawALEValues: null,
      baselineResults: null,
      baselineRawALE: null,
      hasControls: false,
      activeTab: 'controlled',
      activeView: 'distribution',
      errors: null,
      progress: 0,
      resultsOutdated: false,
      sensitivityResult: null,
      sensitivityRunning: false,
      sensitivityProgress: 0,
      comparisonScenarios: null,
      comparisonReferenceId: null,
    }),

  setSensitivityResult: (sensitivityResult) =>
    set({ sensitivityResult, sensitivityRunning: false, sensitivityProgress: 100 }),
  setSensitivityRunning: (sensitivityRunning) => set({ sensitivityRunning }),
  setSensitivityProgress: (sensitivityProgress) => set({ sensitivityProgress }),
  clearSensitivity: () =>
    set({ sensitivityResult: null, sensitivityRunning: false, sensitivityProgress: 0 }),

  setComparison: (comparisonScenarios, comparisonReferenceId) =>
    set({ comparisonScenarios, comparisonReferenceId }),
  clearComparison: () => set({ comparisonScenarios: null, comparisonReferenceId: null }),
}));
