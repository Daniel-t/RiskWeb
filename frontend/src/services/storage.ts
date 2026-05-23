import type {
  Scenario,
  ScenarioMeta,
  Control,
  ControlMeta,
} from '@shared/index';

// --- Storage Port Interface ---
// Allows swapping IndexedDB for an API backend in the future.

export interface StoragePort {
  listScenarios(): Promise<ScenarioMeta[]>;
  getScenario(id: string): Promise<Scenario>;
  saveScenario(scenario: Scenario): Promise<Scenario>;
  deleteScenario(id: string): Promise<void>;

  listControls(): Promise<ControlMeta[]>;
  getControl(id: string): Promise<Control>;
  saveControl(control: Control): Promise<Control>;
  deleteControl(id: string): Promise<void>;
}

// --- IndexedDB Implementation ---

const DB_NAME = 'riskweb';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('scenarios')) {
        db.createObjectStore('scenarios', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('controls')) {
        db.createObjectStore('controls', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txGet<T>(storeName: string, key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      }),
  );
}

function txPut<T>(storeName: string, value: T): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

function txDelete(storeName: string, key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }),
  );
}

// --- IndexedDB Adapter ---

export const storage: StoragePort = {
  async listScenarios(): Promise<ScenarioMeta[]> {
    const all = await txGetAll<Scenario>('scenarios');
    return all
      .map((s) => ({
        id: s.id,
        name: s.name,
        modified: s.metadata.modified,
        meanALE: s.results?.summary.mean,
        p90: s.results?.summary.percentiles[0.9],
      }))
      .sort((a, b) => b.modified.localeCompare(a.modified));
  },

  async getScenario(id: string): Promise<Scenario> {
    const scenario = await txGet<Scenario>('scenarios', id);
    if (!scenario) throw new Error(`Scenario not found: ${id}`);
    return scenario;
  },

  async saveScenario(scenario: Scenario): Promise<Scenario> {
    await txPut('scenarios', scenario);
    return scenario;
  },

  async deleteScenario(id: string): Promise<void> {
    await txDelete('scenarios', id);
  },

  async listControls(): Promise<ControlMeta[]> {
    const all = await txGetAll<Control>('controls');
    return all
      .map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        attackTechniques: c.attackTechniques,
        modified: c.metadata.modified,
      }))
      .sort((a, b) => b.modified.localeCompare(a.modified));
  },

  async getControl(id: string): Promise<Control> {
    const control = await txGet<Control>('controls', id);
    if (!control) throw new Error(`Control not found: ${id}`);
    return control;
  },

  async saveControl(control: Control): Promise<Control> {
    await txPut('controls', control);
    return control;
  },

  async deleteControl(id: string): Promise<void> {
    await txDelete('controls', id);
  },
};
