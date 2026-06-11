---
id: SPEC-CLIPBOARD-EXPORT
title: Clipboard Export/Import Specification
status: approved
assigned: analyst
epic: E4.3
depends_on: [FEAT-CLIPBOARD-EXPORT]
created: 2026-05-25
modifies: context/analyst/spec-clipboard-export.md
---

# Clipboard Export/Import Specification

This document formalizes the FEAT-CLIPBOARD-EXPORT draft into a spec with acceptance criteria and implementation guidance for the helper extraction refactor.

Implementors: @frontend (service refactor + UI). Reviewers: @ux (placement), @secarch (Clipboard API security).

---

## 1. Motivation

See `context/analyst/task-FEAT-CLIPBOARD-EXPORT.md` for full motivation. In brief: enables quick sharing of scenario JSON via chat/email without file downloads, and provides a low-friction import path for JSON already in the clipboard.

---

## 2. Prerequisites: Shared Helper Extraction (TASK-411)

Before implementing clipboard features, refactor `frontend/src/services/fileIO.ts` to extract two reusable functions:

### 2.1 `buildExportPayload(scenario, getControl) -> ScenarioExport`

Extracts the scenario assembly + `_exportedControls` bundling logic from `exportScenarioToFile()`. Returns the serializable object (does NOT trigger download).

**Current code to extract** (fileIO.ts lines 19-32):
```
const exportData: ScenarioExport = { ...scenario };
const controlIds = new Set((scenario.controlAssignments ?? []).map((a) => a.controlId));
if (controlIds.size > 0) { ... }
```

After extraction, `exportScenarioToFile()` becomes:
```
export function exportScenarioToFile(scenario, getControl) {
  const exportData = buildExportPayload(scenario, getControl);
  const json = JSON.stringify(exportData, null, 2);
  // ... blob download logic unchanged
}
```

### 2.2 `parseAndValidateImport(jsonString) -> ImportResult`

Extracts the JSON parse + validate + control extraction logic from `importScenarioFromFile()`. Accepts a raw JSON string, returns `ImportResult` or throws.

**Current code to extract** (fileIO.ts lines 64-80):
```
const data = JSON.parse(text);
const exportedControls = Array.isArray(data._exportedControls) ? ...
delete data._exportedControls;
const result = validateScenario(data);
```

After extraction, `importScenarioFromFile()` becomes:
```
export function importScenarioFromFile(): Promise<ImportResult | null> {
  // ... file picker + size check unchanged
  const text = await file.text();
  return parseAndValidateImport(text);
}
```

---

## 3. Feature A: Copy Scenario JSON to Clipboard

### 3.1 Trigger

- Icon button (clipboard icon) in TopBar, adjacent to the Export button
- Tooltip: "Copy scenario JSON to clipboard"

### 3.2 Behavior

1. Call `buildExportPayload(scenario, getControl)` to assemble the export object
2. Serialize with `JSON.stringify(payload, null, 2)`
3. Write via `navigator.clipboard.writeText(json)`
4. Show success toast: "Scenario JSON copied to clipboard"

### 3.3 Error Handling

- If `navigator.clipboard.writeText()` rejects (permission denied or API unavailable): show error toast "Failed to copy -- clipboard access denied"
- No dirty-state gate: copies current in-memory state regardless of save status

---

## 4. Feature B: Import Scenario from Clipboard

### 4.1 Trigger

- Button inside the Load Scenario modal (exact placement deferred to @ux)
- Label: "Import from Clipboard"

### 4.2 Behavior

1. Read text via `navigator.clipboard.readText()`
2. Check size: if `text.length > 10 * 1024 * 1024`, reject with error toast "Clipboard content too large (>10 MB)"
3. Call `parseAndValidateImport(text)` -- same pipeline as file import
4. Load into stores (same as file import flow in `App.tsx`)
5. Show import summary (imported controls, skipped controls, warnings)

### 4.3 Error Handling

- Clipboard empty or non-JSON: error toast "Clipboard does not contain valid scenario JSON"
- Permission denied: error toast "Clipboard access denied -- please grant permission and try again"
- Validation fails: surface same validation errors as file import

### 4.4 Browser Permissions

`navigator.clipboard.readText()` requires:
- Page must be focused (active tab)
- Some browsers (Firefox) require a user gesture and may show a permission prompt
- The implementation should handle `NotAllowedError` gracefully with an explanatory message

---

## 5. Non-Functional Requirements

- No new dependencies (native Clipboard API)
- Same 10 MB size limit as file import
- Round-trip fidelity: Copy then Import from Clipboard must produce an identical scenario

---

## 6. Out of Scope

- Copying individual nodes or sub-trees
- Minified JSON option
- Auto-detect clipboard content
- Clipboard API polyfills for older browsers

---

## 7. Acceptance Criteria

1. "Copy JSON" button appears in TopBar near Export
2. Clicking Copy writes valid, re-importable JSON (with `_exportedControls`) to clipboard
3. "Import from Clipboard" button appears in Load Scenario modal
4. Importing clipboard JSON loads the scenario identically to file import
5. Round-trip: Copy -> Import from Clipboard -> scenario matches original
6. Success/error toasts appear for both actions
7. Invalid clipboard content shows clear error without corrupting app state
8. Clipboard text exceeding 10 MB is rejected
9. `exportScenarioToFile()` and `importScenarioFromFile()` continue to work unchanged after refactor
10. Permission denial shows a human-readable error message
