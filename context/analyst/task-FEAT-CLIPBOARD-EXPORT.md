---
id: FEAT-CLIPBOARD-EXPORT
status: draft
priority: low
assigned: --
reviewers:
  - "@frontend"
  - "@ux"
  - "@secarch"
depends_on: []
modifies:
  - frontend/src/App.tsx
  - frontend/src/components/Layout/TopBar.tsx
  - frontend/src/services/fileIO.ts
  - frontend/src/components/SaveLoad/LoadScenarioModal.tsx
---

# FEAT-CLIPBOARD-EXPORT: Copy/Import Scenario JSON via Clipboard

## Summary

Add two complementary UI actions:

1. **Copy JSON** -- copies the current scenario (with bundled controls) to the system clipboard.
2. **Import from clipboard** -- reads scenario JSON from the clipboard, validates it, and loads it using the same pipeline as file import.

## Motivation

- Paste a scenario into a chat or issue tracker without creating a file
- Quick debugging -- inspect raw JSON without downloading
- Transfer scenarios between browser tabs or devices via clipboard
- Lower friction for users who already have JSON in their clipboard (e.g., from a colleague's message)

## Feature A: Copy Scenario JSON to Clipboard

### FR-A1: Copy Action

- A "Copy JSON" button shall be accessible from the TopBar, near the existing Export button.
- Clicking it assembles the full scenario from active Zustand stores (tree, scenario, simulation, control assignments) -- identical to the existing `handleExport()` path in `App.tsx`.
- The scenario is serialized with `JSON.stringify(payload, null, 2)` and written via `navigator.clipboard.writeText()`.

### FR-A2: Bundled Controls

- The copied JSON **must** include the `_exportedControls` array, exactly as the file export does, so the output is self-contained and re-importable.

### FR-A3: User Feedback

- On success: brief toast/snackbar -- "Scenario JSON copied to clipboard".
- On failure (e.g., permission denied): error toast with human-readable message.

### FR-A4: No Dirty-State Gate

- Copies current in-memory state whether or not the scenario has been saved (mirrors file Export behavior).

## Feature B: Import Scenario from Clipboard

### FR-B1: Paste Action

- An "Import from clipboard" button shall be available in a less-prominent location -- suggested placement: inside the Load Scenario modal, or as a secondary option near the Import button. **Defer exact placement to @ux.**

### FR-B2: Identical Import Pipeline

- Reads text from clipboard via `navigator.clipboard.readText()`.
- Passes the text through the **same validation and import pipeline** as file import:
  - Parse JSON
  - Validate scenario structure (`validateScenario()`)
  - Extract and import `_exportedControls` (skip duplicates)
  - Load into all stores (tree, scenario, simulation, control assignments)
  - Show import summary (imported controls, skipped controls, warnings)

### FR-B3: Error Handling

- If clipboard is empty or does not contain valid JSON: display error toast "Clipboard does not contain valid scenario JSON".
- If clipboard permission is denied: display error toast explaining the permission requirement.
- If validation fails: surface the same validation errors as file import.

### FR-B4: Size Limit

- Apply the same 10 MB size check used by file import to the clipboard text length.

## Non-Functional Requirements

- **No new dependencies** -- use native Clipboard API (`navigator.clipboard`), supported in all target browsers.
- **Reuse existing logic** -- extract shared helpers from the current file export/import code rather than duplicating.

## UI Placement (guidance for @ux)

| Action | Suggested placement | Notes |
|--------|-------------------|-------|
| Copy JSON | Icon button (clipboard icon) next to Export in TopBar, with tooltip | Alternatively, a dropdown on Export with "Download file" / "Copy to clipboard" |
| Import from clipboard | Button inside LoadScenarioModal, or secondary option near Import button | Should be less prominent than file import; @ux to decide final placement |

## Out of Scope

- Copying individual nodes or sub-trees
- Minified or partial JSON export
- Real-time clipboard monitoring / auto-detect

## Implementation Notes for @frontend

1. **Extract shared build logic**: The scenario assembly + `_exportedControls` bundling in `fileIO.ts` (`exportScenarioToFile`) should be split so a pure function (e.g., `buildExportPayload(scenario, getControl)`) returns the exportable object. Both file export and clipboard copy call this.
2. **Extract shared import logic**: Similarly, factor out the JSON-parse + validate + extract-controls logic from `importScenarioFromFile()` into a function like `parseAndValidateScenario(jsonString)` that both file import and clipboard import can use.
3. **Clipboard API**:
   ```ts
   // Copy
   const json = JSON.stringify(payload, null, 2);
   await navigator.clipboard.writeText(json);

   // Paste
   const text = await navigator.clipboard.readText();
   ```
4. **Toast/snackbar**: Reuse whatever notification pattern exists in the app, or introduce a minimal one if none exists.

## Acceptance Criteria

1. User clicks "Copy JSON" in TopBar -> clipboard contains valid, re-importable JSON with `_exportedControls`.
2. User clicks "Import from clipboard" -> scenario loads identically to file import, including bundled controls.
3. Copied JSON can round-trip: Copy -> Paste into Import from clipboard -> scenario matches original.
4. Success/error toasts appear for both actions.
5. Invalid clipboard content shows clear error message without corrupting app state.
