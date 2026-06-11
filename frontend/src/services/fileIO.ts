import type { Control, Scenario } from '@shared/index';
import { isValidControl, validateScenario } from './validate';

export interface ImportResult {
  scenario: Scenario;
  importedControls: Control[];
  skippedControls: number;
  warnings: string[];
}

interface ScenarioExport extends Scenario {
  _exportedControls?: Control[];
}

const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 100);
}

export function buildExportPayload(
  scenario: Scenario,
  getControl: (id: string) => Control | undefined,
): ScenarioExport {
  const exportData: ScenarioExport = { ...scenario };

  const controlIds = new Set((scenario.controlAssignments ?? []).map((a) => a.controlId));
  if (controlIds.size > 0) {
    const controls: Control[] = [];
    for (const id of controlIds) {
      const c = getControl(id);
      if (c) controls.push(c);
    }
    if (controls.length > 0) {
      exportData._exportedControls = controls;
    }
  }

  return exportData;
}

export function parseAndValidateImport(jsonString: string): ImportResult {
  if (jsonString.length > MAX_IMPORT_SIZE) {
    throw new Error(
      `Import too large (${(jsonString.length / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
    );
  }

  const data = JSON.parse(jsonString);

  const exportedControls: Control[] = Array.isArray(data._exportedControls)
    ? data._exportedControls.filter(isValidControl)
    : [];
  delete data._exportedControls;

  const result = validateScenario(data);
  if (!result.valid) {
    throw new Error('Invalid scenario file:\n' + result.errors.join('\n'));
  }

  return {
    scenario: result.scenario!,
    importedControls: exportedControls,
    skippedControls: 0,
    warnings: result.warnings,
  };
}

export function exportScenarioToFile(
  scenario: Scenario,
  getControl: (id: string) => Control | undefined,
): void {
  const exportData = buildExportPayload(scenario, getControl);

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(scenario.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importScenarioFromFile(): Promise<ImportResult | null> {
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
        if (file.size > MAX_IMPORT_SIZE) {
          throw new Error(
            `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
          );
        }

        const text = await file.text();
        resolve(parseAndValidateImport(text));
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to read file');
        resolve(null);
      }
    };
    input.click();
  });
}
