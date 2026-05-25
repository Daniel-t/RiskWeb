---
id: DEFECT-SAVE
status:
priority: high
assigned: "@frontend"
reviewers: ["@analyst", "@secarch", "@test"]
depends_on: []
modifies:
  - frontend/src/services/api.ts
  - frontend/src/store/scenarioStore.ts
  - frontend/src/App.tsx
  - frontend/src/components/SaveLoad/SaveConfirmDialog.tsx (new)
---

# Defect Fix: Scenario Save Logic — Two Bugs

## Summary

Two related bugs in the save flow:

1. **Rename + Save overwrites original** — changing the scenario name and saving silently overwrites the original record instead of prompting the user.
2. **Save after import throws "Scenario not found"** — importing a JSON scenario sets the in-memory ID but never persists to IndexedDB, so the next save fails.

## Bug A: Rename Overwrites Original

**Root cause:** `handleSave` (`App.tsx:99-112`) uses `scenarioStore.id` to decide update vs. create. Renaming via `setName()` (`scenarioStore.ts:53`) does not clear the ID, so the update path always fires, overwriting the original.

**Fix:** Track `savedName` in the store. On save, if `name !== savedName && id !== null`, show a confirmation dialog with Save As New / Overwrite / Cancel.

## Bug B: Import Then Save Error

**Root cause:** `handleImport` (`App.tsx:211-212`) calls `loadScenario()` with the imported ID but never writes to IndexedDB. `updateScenario` (`api.ts:29`) calls `getScenario(id)` to get the `created` timestamp — throws because the record doesn't exist.

**Fix:** Make `updateScenario` resilient — wrap `getScenario(id)` in try/catch, fall back to `created: now` if not found.

## Implementation Steps

### Step 1: Fix `updateScenario` in `api.ts` (Bug B)

In `updateScenario` (lines 25-36), wrap the `getScenario(id)` call:
- try: get existing record, use `existing.metadata.created`
- catch: use `new Date().toISOString()` as `created`
- Either way, call `saveScenario()` with the ID

### Step 2: Add `savedName` to `scenarioStore.ts` (Bug A)

- Add `savedName: string` to the `ScenarioStore` interface
- Initial value: `'Untitled Scenario'`
- In `loadScenario()`: set `savedName: data.name`
- In `markClean()`: set `savedName` to current `name` (use `set((state) => ...)`)
- In `resetScenario()`: set `savedName: 'Untitled Scenario'`

### Step 3: Create `SaveConfirmDialog` component (Bug A)

New file: `frontend/src/components/SaveLoad/SaveConfirmDialog.tsx`

Simple modal with:
- Message: "Scenario name changed from '{savedName}' to '{name}'. How would you like to save?"
- Three buttons: "Save As New" / "Overwrite" / "Cancel"
- Props: `open`, `oldName`, `newName`, `onSaveAsNew`, `onOverwrite`, `onCancel`

Reuse styling patterns from `LoadScenarioModal`.

### Step 4: Update `handleSave` in `App.tsx` (Bug A)

- Add state: `const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)`
- In `handleSave`: if `name !== savedName && id !== null`, set `saveConfirmOpen = true` and return
- Add `handleSaveAsNew`: set `scenarioStore.setId(null)`, then run create path
- Add `handleOverwrite`: run existing update path
- Render `SaveConfirmDialog` in JSX

## Verification

| Test Case | Expected |
|-----------|----------|
| Import JSON, edit, Save | Saves successfully (no error) |
| Load "A", rename to "B", Save | Dialog appears: Save As New / Overwrite / Cancel |
| Dialog → "Save As New" | New scenario "B" created; "A" untouched in Load list |
| Dialog → "Overwrite" | "A" updated to "B" in-place |
| Dialog → "Cancel" | No save, dirty flag remains |
| Load "A", edit tree (no rename), Save | Saves silently, no dialog |
| New scenario (never saved), Save | Saves silently as new record |
