import { create } from 'zustand';
import type { Control, ControlMeta, ControlAssignment } from '@shared/index';
import * as api from '../services/api';
import { useScenarioStore } from './scenarioStore';

export interface ControlStore {
  controls: ControlMeta[];
  controlCache: Map<string, Control>;
  assignments: ControlAssignment[];
  isLoading: boolean;

  loadControls: () => Promise<void>;
  getControl: (id: string) => Promise<Control>;
  createControl: (
    data: Omit<Control, 'id' | 'metadata'>,
  ) => Promise<Control>;
  updateControl: (
    id: string,
    data: Omit<Control, 'id' | 'metadata'>,
  ) => Promise<Control>;
  deleteControl: (id: string) => Promise<void>;

  loadAssignments: (assignments: ControlAssignment[]) => void;
  resetAssignments: () => void;
  addAssignment: (controlId: string, nodeId: string) => void;
  removeAssignment: (assignmentId: string) => void;
  removeAssignmentsForNode: (nodeId: string) => void;
  toggleAssignment: (assignmentId: string) => void;
  updateAssignmentOverride: (
    assignmentId: string,
    overrides: Partial<
      Pick<ControlAssignment, 'lefReductionOverride' | 'lmReductionOverride'>
    >,
  ) => void;
  getNodeAssignments: (nodeId: string) => ControlAssignment[];
}

export const useControlStore = create<ControlStore>((set, get) => ({
  controls: [],
  controlCache: new Map(),
  assignments: [],
  isLoading: false,

  async loadControls() {
    set({ isLoading: true });
    try {
      const controls = await api.listControls();
      set({ controls, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  async getControl(id: string) {
    const cached = get().controlCache.get(id);
    if (cached) return cached;
    const control = await api.getControl(id);
    set((state) => {
      const newCache = new Map(state.controlCache);
      newCache.set(id, control);
      return { controlCache: newCache };
    });
    return control;
  },

  async createControl(data) {
    const control = await api.createControl(data);
    set((state) => {
      const newCache = new Map(state.controlCache);
      newCache.set(control.id, control);
      return { controlCache: newCache };
    });
    await get().loadControls();
    return control;
  },

  async updateControl(id, data) {
    const control = await api.updateControl(id, data);
    set((state) => {
      const newCache = new Map(state.controlCache);
      newCache.set(id, control);
      return { controlCache: newCache };
    });
    await get().loadControls();
    return control;
  },

  async deleteControl(id) {
    await api.deleteControl(id);
    set((state) => {
      const newCache = new Map(state.controlCache);
      newCache.delete(id);
      return { controlCache: newCache };
    });
    await get().loadControls();
  },

  loadAssignments(assignments) {
    set({ assignments });
  },

  resetAssignments() {
    set({ assignments: [] });
  },

  addAssignment(controlId, nodeId) {
    const existing = get().assignments;
    if (existing.some((a) => a.controlId === controlId && a.nodeId === nodeId)) {
      return;
    }
    const assignment: ControlAssignment = {
      id: crypto.randomUUID(),
      controlId,
      nodeId,
      enabled: true,
    };
    set((state) => ({ assignments: [...state.assignments, assignment] }));
    useScenarioStore.getState().markDirty();
  },

  removeAssignment(assignmentId) {
    set((state) => ({
      assignments: state.assignments.filter((a) => a.id !== assignmentId),
    }));
    useScenarioStore.getState().markDirty();
  },

  removeAssignmentsForNode(nodeId) {
    set((state) => ({
      assignments: state.assignments.filter((a) => a.nodeId !== nodeId),
    }));
  },

  toggleAssignment(assignmentId) {
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? { ...a, enabled: !a.enabled } : a,
      ),
    }));
    useScenarioStore.getState().markDirty();
  },

  updateAssignmentOverride(assignmentId, overrides) {
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === assignmentId ? { ...a, ...overrides } : a,
      ),
    }));
    useScenarioStore.getState().markDirty();
  },

  getNodeAssignments(nodeId) {
    return get().assignments.filter((a) => a.nodeId === nodeId);
  },
}));
