---
from: "@analyst"
to: "@frontend"
task: DEFECT-SAVE
date: 2026-05-24
---

# Handoff: Scenario Save Defects → @frontend

## What

Two bugs in the save flow need fixing. Full spec is in `context/frontend/defect-save-overwrite.md`.

## Bug A — Rename + Save silently overwrites original scenario

- User renames scenario in TopBar, clicks Save → original record is overwritten with new name
- Cause: `scenarioStore.id` persists through rename, `handleSave` always uses update path
- Fix: track `savedName`, detect mismatch, show confirmation dialog (Save As New / Overwrite / Cancel)

## Bug B — Save after import throws "Scenario not found"

- User imports JSON, edits, clicks Save → error alert
- Cause: `handleImport` sets in-memory ID but never persists to IndexedDB; `updateScenario` fetches existing record and throws
- Fix: make `updateScenario` in `api.ts` resilient to missing records (try/catch, fallback `created: now`)

## Files to modify

- `frontend/src/services/api.ts` — `updateScenario` resilience
- `frontend/src/store/scenarioStore.ts` — add `savedName` field
- `frontend/src/App.tsx` — save flow + dialog state
- `frontend/src/components/SaveLoad/SaveConfirmDialog.tsx` — new dialog component

## Priority

Bug B is higher priority (blocks save entirely). Bug A is medium (data loss risk but not a hard error). Both should ship together since they touch the same code paths.
