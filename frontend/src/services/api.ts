// Re-export storage adapter methods with the same interface the app expects.
// This replaces the old HTTP-based API with local IndexedDB storage.

import type { Scenario, ScenarioMeta, Control, ControlMeta } from '@shared/index';
import { storage } from './storage';

export function listScenarios(): Promise<ScenarioMeta[]> {
  return storage.listScenarios();
}

export function getScenario(id: string): Promise<Scenario> {
  return storage.getScenario(id);
}

export function createScenario(data: Omit<Scenario, 'id' | 'metadata'>): Promise<Scenario> {
  const now = new Date().toISOString();
  const scenario: Scenario = {
    ...data,
    id: crypto.randomUUID(),
    metadata: { created: now, modified: now },
  };
  return storage.saveScenario(scenario);
}

export function updateScenario(
  id: string,
  data: Omit<Scenario, 'id' | 'metadata'>,
): Promise<Scenario> {
  return storage.getScenario(id).then((existing) => {
    const scenario: Scenario = {
      ...data,
      id,
      metadata: { created: existing.metadata.created, modified: new Date().toISOString() },
    };
    return storage.saveScenario(scenario);
  });
}

export function deleteScenario(id: string): Promise<void> {
  return storage.deleteScenario(id);
}

// --- Controls ---

export function listControls(): Promise<ControlMeta[]> {
  return storage.listControls();
}

export function getControl(id: string): Promise<Control> {
  return storage.getControl(id);
}

export function createControl(data: Omit<Control, 'id' | 'metadata'>): Promise<Control> {
  const now = new Date().toISOString();
  const control: Control = {
    ...data,
    id: crypto.randomUUID(),
    metadata: { created: now, modified: now },
  };
  return storage.saveControl(control);
}

export function updateControl(
  id: string,
  data: Omit<Control, 'id' | 'metadata'>,
): Promise<Control> {
  return storage.getControl(id).then((existing) => {
    const control: Control = {
      ...data,
      id,
      metadata: { created: existing.metadata.created, modified: new Date().toISOString() },
    };
    return storage.saveControl(control);
  });
}

export function deleteControl(id: string): Promise<void> {
  return storage.deleteControl(id);
}
