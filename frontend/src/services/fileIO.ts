import type { Scenario } from '@shared/index';
import { validateScenario } from './validate';

export function exportScenarioToFile(scenario: Scenario): void {
  const json = JSON.stringify(scenario, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${scenario.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importScenarioFromFile(): Promise<Scenario | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!validateScenario(data)) {
          throw new Error('Invalid scenario file: missing or malformed required fields');
        }
        resolve(data);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to read file');
        resolve(null);
      }
    };
    input.click();
  });
}
