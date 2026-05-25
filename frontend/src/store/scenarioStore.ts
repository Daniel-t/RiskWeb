import { create } from 'zustand';
import type { Distribution, SimulationConfig } from '@shared/index';

export interface ScenarioStore {
  id: string | null;
  name: string;
  savedName: string;
  description: string;
  lossMagnitude: Distribution | undefined;
  simulationConfig: SimulationConfig;
  isDirty: boolean;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  resultsDrawerExpanded: boolean;

  setId: (id: string | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setLossMagnitude: (dist: Distribution | undefined) => void;
  updateSimConfig: (config: Partial<SimulationConfig>) => void;
  markClean: () => void;
  markDirty: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleResultsDrawer: () => void;
  setResultsDrawerExpanded: (expanded: boolean) => void;
  resetScenario: () => void;
  loadScenario: (data: {
    id: string;
    name: string;
    description?: string;
    lossMagnitude?: Distribution;
    simulationConfig: SimulationConfig;
  }) => void;
}

const DEFAULT_SIM_CONFIG: SimulationConfig = {
  iterations: 10000,
  confidenceIntervals: [0.1, 0.5, 0.9],
};

export const useScenarioStore = create<ScenarioStore>((set) => ({
  id: null,
  name: 'Untitled Scenario',
  savedName: 'Untitled Scenario',
  description: '',
  lossMagnitude: undefined,
  simulationConfig: { ...DEFAULT_SIM_CONFIG },
  isDirty: false,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  resultsDrawerExpanded: false,

  setId: (id) => set({ id }),
  setName: (name) => set({ name, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),
  setLossMagnitude: (dist) => set({ lossMagnitude: dist, isDirty: true }),
  updateSimConfig: (config) =>
    set((state) => ({
      simulationConfig: { ...state.simulationConfig, ...config },
      isDirty: true,
    })),
  markClean: () => set((state) => ({ isDirty: false, savedName: state.name })),
  markDirty: () => set({ isDirty: true }),
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarCollapsed: !state.rightSidebarCollapsed })),
  toggleResultsDrawer: () =>
    set((state) => ({ resultsDrawerExpanded: !state.resultsDrawerExpanded })),
  setResultsDrawerExpanded: (expanded) => set({ resultsDrawerExpanded: expanded }),
  resetScenario: () =>
    set({
      id: null,
      name: 'Untitled Scenario',
      savedName: 'Untitled Scenario',
      description: '',
      lossMagnitude: undefined,
      simulationConfig: { ...DEFAULT_SIM_CONFIG },
      isDirty: false,
      resultsDrawerExpanded: false,
    }),
  loadScenario: (data) =>
    set({
      id: data.id,
      name: data.name,
      savedName: data.name,
      description: data.description ?? '',
      lossMagnitude: data.lossMagnitude,
      simulationConfig: data.simulationConfig,
      isDirty: false,
    }),
}));
