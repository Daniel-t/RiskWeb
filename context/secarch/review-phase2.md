---
id: TASK-223
title: "Phase 2 Security Review Report"
status: complete
date: 2026-05-21
reviewer: "@secarch"
verdict: PASS
scope: "Phase 2: Controls & Enrichment (Waves C + D)"
finding_counts:
  critical: 0
  high: 0
  medium: 2
  low: 3
  info: 0
---

# Phase 2 Security Review Report

**Reviewer**: @secarch
**Date**: 2026-05-21
**Scope**: All Phase 2 implementation code (TASK-212 through TASK-228)
**Baseline**: Phase 1 review (TASK-115) passed; this review covers new Phase 2 attack surface only
**Architecture**: Client-side SPA -- no backend, no server APIs, no CORS surface

---

## Executive Summary

**Verdict: PASS**

Phase 2 introduces the controls feature (control library, drag-drop assignment, simulation engine with LEF/LM reductions, baseline vs. controlled comparison, save/load with controls). The new code was reviewed across 7 scopes (S1--S7). No Critical or High severity findings were identified.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 0 |
| Medium   | 2 |
| Low      | 3 |

The 2 Medium findings should be remediated before production deployment. The 3 Low findings are recommended improvements with no immediate exploitation risk.

---

## Scope Coverage

All 7 review scopes defined in TASK-223 were examined.

| Scope | Area | Files Reviewed | Status |
|-------|------|----------------|--------|
| S1 | IndexedDB Storage Layer | `frontend/src/services/storage.ts`, `frontend/src/services/api.ts` | Reviewed -- no findings |
| S2 | JSON Import/Export Sanitization | `frontend/src/services/fileIO.ts`, `frontend/src/services/validate.ts` | Reviewed -- 3 findings (F-01, F-02, F-05) |
| S3 | Control Form Inputs (XSS Surface) | `ControlFormModal.tsx`, `ControlCard.tsx`, `ControlLibraryPanel.tsx` | Reviewed -- no findings |
| S4 | Web Worker Message Passing | `frontend/src/workers/simulation.worker.ts`, `frontend/src/workers/fairEngine.ts` | Reviewed -- 1 finding (F-03) |
| S5 | Drag-and-Drop Interaction | `AttackTreeCanvas.tsx`, `LeafNode.tsx` | Reviewed -- 1 finding (F-04) |
| S6 | Catalog Data (Static JSON) | `shared/data/attack-catalog.json`, `shared/data/d3fend-mappings.json`, `frontend/src/services/catalog.ts` | Reviewed -- no findings |
| S7 | Zustand Store Security | `frontend/src/store/controlStore.ts`, `frontend/src/store/simulationStore.ts` | Reviewed -- no findings |

---

## Findings Summary

| ID | Severity | Scope | File | Description |
|----|----------|-------|------|-------------|
| F-01 | MEDIUM | S2 | `fileIO.ts:56` | No file size limit on JSON import |
| F-02 | MEDIUM | S2 | `fileIO.ts:60-62` | `_exportedControls` array not schema-validated |
| F-03 | LOW | S4 | `simulation.worker.ts:141` | No wall-clock timeout on simulation worker |
| F-04 | LOW | S5 | `LeafNode.tsx:79-83` | Drop handler does not validate controlId exists in store |
| F-05 | LOW | S2 | `fileIO.ts:39` | Filename not length-limited on export |

---

## Detailed Findings

### F-01 [MEDIUM] No file size limit on JSON import

- **Scope**: S2 -- JSON Import/Export Sanitization
- **File**: `frontend/src/services/fileIO.ts:56`
- **Description**: `importScenarioFromFile()` calls `file.text()` without first checking `file.size`. A user selecting a multi-gigabyte file (malicious or accidental) could exhaust browser memory, causing the tab to crash.
- **Code**:
  ```typescript
  const text = await file.text();  // line 56 -- no size guard
  const data = JSON.parse(text);
  ```
- **Impact**: Denial of service (browser tab crash). Requires local user action (file selection), so exploitation requires social engineering or a user mistake.
- **Remediation**: Check `file.size` before calling `file.text()`. Reject files exceeding a reasonable threshold (e.g., 10 MB):
  ```typescript
  const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_IMPORT_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
  }
  const text = await file.text();
  ```

---

### F-02 [MEDIUM] `_exportedControls` array not schema-validated

- **Scope**: S2 -- JSON Import/Export Sanitization
- **File**: `frontend/src/services/fileIO.ts:60-62`
- **Description**: When importing a scenario file, `_exportedControls` is checked with `Array.isArray()` but individual `Control` objects within the array are not validated against the Control schema. These unvalidated objects are passed through as `importedControls` and may be stored directly in IndexedDB by the caller. A crafted file could include Control objects with missing fields, incorrect types, or extraneous properties.
- **Code**:
  ```typescript
  const exportedControls: Control[] = Array.isArray(data._exportedControls)
    ? data._exportedControls   // line 61 -- items not validated
    : [];
  ```
- **Impact**: Malformed Control objects stored in IndexedDB could cause runtime errors when rendered in the UI (e.g., missing `name`, invalid `lefReduction` distribution). The simulation engine would also receive malformed control data.
- **Remediation**: Add an `isValidControl()` validation function (checking `id`, `name`, `category`, `lefReduction` distribution shape at minimum) and filter the array:
  ```typescript
  const exportedControls: Control[] = Array.isArray(data._exportedControls)
    ? data._exportedControls.filter(isValidControl)
    : [];
  ```
  Add a warning for any items that fail validation.

---

### F-03 [LOW] No wall-clock timeout on simulation worker

- **Scope**: S4 -- Web Worker Message Passing
- **File**: `frontend/src/workers/simulation.worker.ts:141`
- **Description**: The simulation loop enforces an iteration cap (1,000,000) and supports user-initiated cancellation (checked every `progressInterval` iterations). However, there is no maximum wall-clock execution time. On slow machines or with complex trees, the worker could run for an extended period. The cancellation mechanism requires the user to actively click cancel.
- **Code**:
  ```typescript
  for (let k = 0; k < iterations; k++) {
    if (k % progressInterval === 0 && cancelled) {
      return null;
    }
    // ... no elapsed-time check ...
  }
  ```
- **Impact**: Extended UI unresponsiveness on slow devices. Low severity because the user controls the iteration count and can cancel manually.
- **Remediation**: Add a wall-clock check alongside the cancellation check. Auto-cancel and post a warning if elapsed time exceeds a threshold (e.g., 120 seconds):
  ```typescript
  if (k % progressInterval === 0) {
    if (cancelled) return null;
    if (performance.now() - startTime > 120_000) {
      self.postMessage({ type: 'error', errors: ['Simulation timed out after 120 seconds'] });
      return null;
    }
  }
  ```

---

### F-04 [LOW] Drop handler does not validate controlId exists in store

- **Scope**: S5 -- Drag-and-Drop Interaction
- **File**: `frontend/src/components/Canvas/nodes/LeafNode.tsx:79-83`
- **Description**: The `handleDrop` callback reads `controlId` from `dataTransfer` and passes it directly to `addAssignment()` without verifying that the control exists in `controlCache`. While `addAssignment()` checks for duplicate assignments, it does not verify the control exists. This could create orphaned assignments referencing a non-existent control.
- **Code**:
  ```typescript
  const controlId = e.dataTransfer.getData('application/riskweb-control-id');
  if (!controlId) return;
  useControlStore.getState().addAssignment(controlId, id);  // no existence check
  ```
- **Impact**: Low. The simulation engine handles orphaned assignments gracefully (logs a warning and skips them at `simulation.worker.ts:108-111`). The UI would show "Unknown" for the control name. No crash or security vulnerability, but a data integrity issue.
- **Remediation**: Check `controlCache` before calling `addAssignment`:
  ```typescript
  const { controlCache, addAssignment } = useControlStore.getState();
  if (!controlCache.has(controlId)) return;
  addAssignment(controlId, id);
  ```

---

### F-05 [LOW] Filename not length-limited on export

- **Scope**: S2 -- JSON Import/Export Sanitization
- **File**: `frontend/src/services/fileIO.ts:39`
- **Description**: The export function constructs the download filename from `scenario.name` after regex sanitization but does not truncate the result. A scenario with a very long name would produce a very long filename, which could cause issues on filesystems with path length limits.
- **Code**:
  ```typescript
  a.download = `${scenario.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;  // no length limit
  ```
- **Impact**: Download may silently fail or produce a truncated filename on some operating systems. No security risk; usability issue only.
- **Remediation**: Truncate the sanitized name:
  ```typescript
  const safeName = scenario.name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 100);
  a.download = `${safeName}.json`;
  ```

---

## Positive Patterns

The following security-relevant practices were verified and found to be well-implemented:

1. **No XSS vectors**: No usage of `dangerouslySetInnerHTML`, `eval()`, `Function()`, or `innerHTML` found anywhere in Phase 2 code. All user-entered text (control names, descriptions, technique IDs) is rendered through React JSX, which auto-escapes. Badge popovers in `LeafNode.tsx` use React elements, not innerHTML.

2. **Prototype pollution is not a risk**: `JSON.parse()` creates own-properties only and does not set prototype chain properties. The import path has no deep merge utilities. `validateScenario()` constructs the output scenario from validated fields, providing an additional layer of sanitization.

3. **Immutable Zustand state updates**: All store mutations in `controlStore.ts` and `simulationStore.ts` create new arrays, objects, and Maps. No direct mutation of existing state was found. No Zustand devtools middleware is present in the code.

4. **Static catalog data bundled at build time**: ATT&CK and D3FEND data is imported as static JSON via ES module imports. No `fetch()` calls to external URLs for catalog data. No `eval()` or `Function()` processing of catalog content.

5. **ATT&CK/D3FEND technique ID validation**: Technique IDs in the control form are validated with strict regex patterns (`/^T\d{4}(\.\d{3})?$/` and `/^D3-[A-Z]{2,5}$/`), preventing injection through those fields.

6. **Worker cancellation and iteration bounds**: The simulation worker enforces a maximum of 1,000,000 iterations, checks a cancellation flag every `progressInterval` iterations, and handles orphaned control assignments gracefully with warning messages rather than crashes.

7. **Thorough scenario import validation**: `validateScenario()` validates all core fields, node types, edge structure, and controlAssignment shape including distribution validation for overrides. Invalid override distributions are stripped with warnings. Duplicate assignments are deduplicated.

8. **NaN/Infinity clamping**: The simulation engine clamps non-finite ALE values to 0 (`simulation.worker.ts:157`) and non-finite gate results to 0 (`fairEngine.ts:159`), preventing mathematical edge cases from corrupting results.

9. **Secure ID generation**: Uses `crypto.randomUUID()` for all entity IDs, providing cryptographically random UUIDs.

10. **Custom MIME type for drag-drop**: Control drag uses `application/riskweb-control-id` custom MIME type, reducing cross-origin drag interference risk.

---

## Remediation Requirements

### Before Production Deployment (MUST FIX)

| Finding | Priority | Assignee |
|---------|----------|----------|
| F-01: File size limit on import | MUST FIX | @frontend |
| F-02: Validate `_exportedControls` items | MUST FIX | @frontend |

These two Medium findings represent gaps in input validation on the file import path. Both are straightforward fixes.

### Recommended Improvements (SHOULD FIX)

| Finding | Priority | Assignee |
|---------|----------|----------|
| F-03: Wall-clock timeout on worker | SHOULD FIX | @frontend |
| F-04: controlId existence check on drop | SHOULD FIX | @frontend |
| F-05: Filename length limit on export | SHOULD FIX | @frontend |

These Low findings have no immediate security risk but improve robustness. They can be addressed in a subsequent patch.

### No Separate Remediation Tasks Created

Since there are no Critical or High findings, no separate remediation task files are required per the TASK-223 acceptance criteria. The Medium findings are documented here for @frontend to address before Phase 2 sign-off.

---

## Comparison with Phase 1 Review

| Metric | Phase 1 (TASK-115) | Phase 2 (TASK-223) |
|--------|--------------------|--------------------|
| Architecture | Client + Server | Client-only SPA |
| Attack surface | Network APIs, filesystem, CORS | File import, Web Worker, drag-drop |
| Critical/High | 0 | 0 |
| Medium | 0 | 2 |
| Low | 0 | 3 |
| Verdict | PASS | PASS |

The removal of the backend eliminated the most significant potential attack surface (path traversal, CORS, API validation). Phase 2 findings are moderate severity, reflecting the reduced attack surface of a client-only SPA.
