---
id: TASK-330
title: Phase 3 Backward Compatibility & Migration Validation
status: in-progress
assigned: analyst
priority: high
depends_on: [TASK-320, TASK-321, TASK-322, TASK-323, TASK-324]
reviewers: [secarch, test]
method: Code trace + runtime verification
date: 2026-05-26
---

# Phase 3 Backward Compatibility & Migration Validation

**Task:** TASK-330
**Author:** @analyst
**Date:** 2026-05-26
**Dependencies:** Wave B engine (done), Wave C UI (pending)
**Method:** Code trace against implementation files; runtime UI validation deferred until Wave C.

---

## Executive Summary

| # | Scenario | Expected | Verified Against | Status |
|---|----------|----------|------------------|--------|
| 1 | Phase 2 scenario loads (direct LEF only) | Simulates unchanged | fairEngine.ts:120-126 | PASS |
| 2 | Phase 2 scenario with controlAssignments | Controls load intact | validate.ts:48-140 | PASS |
| 3 | Phase 3 scenario with TEF x Vuln saves/loads | Round-trips correctly | shared/src/index.ts:23-27 | PASS |
| 4 | Mixed-mode tree (direct + decomposed) | Both modes simulate | fairEngine.ts:120-126 | PASS |
| 5 | JSON export includes tef/vulnerability | Fields serialized when present | fileIO.ts (JSON.stringify) | PASS |
| 6 | JSON import of Phase 2 scenario | No errors, tef/vuln absent | validate.ts:170-181 | PASS |
| 7 | SimulationResult.samples absent (old results) | LEC gracefully degrades | shared/src/index.ts:68 | PASS |
| 8 | SensitivityResult not persisted | Ephemeral in store only | shared/src/index.ts:159-186 | PASS |
| 9 | ComparisonState not persisted | Ephemeral Zustand only | spec-scenario-comparison.md §4.2 | PASS (by design) |
| 10 | Phase 2 scenario opens in Phase 3 UI | No UI errors | -- | DEFERRED |

---

## Detailed Scenarios

### Scenario 1: Phase 2 Scenario Loads and Simulates (Direct LEF Only)

**Setup:** A scenario saved before Phase 3 — leaf nodes have `fairInputs: { lef: { type: 'pert', params: { min, mode, max } } }` with no `tef` or `vulnerability` fields.

**Code trace:** `fairEngine.ts:120-126`
```
if (node.fairInputs.tef && node.fairInputs.vulnerability) {
  // Decomposed path — NOT taken because tef is undefined
} else {
  lef = sampleDistribution(node.fairInputs.lef, rng);  // Direct path taken
}
```

The `&&` guard ensures that if `tef` is undefined (which it is for all Phase 2 scenarios), the engine falls through to the direct LEF sampling path. No changes to behavior.

**Result:** PASS

### Scenario 2: Phase 2 Scenario with controlAssignments

**Setup:** Phase 2 scenario with `controlAssignments[]` array containing node-control bindings.

**Code trace:** `validate.ts:48-140` — the `validateControlAssignments()` function processes the array. It validates `id`, `controlId`, `nodeId`, `enabled`, and optional overrides. No new required fields were added in Phase 3.

The `fairEngine.ts:128-142` control reduction pipeline is unchanged — it reads `assignment.lefReductionOverride ?? control.lefReduction` and applies multiplicative stacking. Phase 3 did not modify this path.

**Result:** PASS

### Scenario 3: Phase 3 Scenario with TEF x Vulnerability Saves/Loads

**Setup:** A leaf node with `fairInputs: { lef: ..., tef: { type: 'pert', ... }, vulnerability: { type: 'pert', ... } }`.

**Code trace:** `shared/src/index.ts:23-27`
```typescript
export interface FAIRInputs {
  lef: Distribution;          // Required (always present)
  tef?: Distribution;         // Optional — new in Phase 3
  vulnerability?: Distribution; // Optional — new in Phase 3
}
```

The `tef` and `vulnerability` fields are optional on the `FAIRInputs` interface. IndexedDB stores full scenario objects as-is (structured clone). JSON export uses `JSON.stringify`, which includes all defined properties. On load/import, optional fields are preserved if present.

`validate.ts:170-181` validates nodes by checking `id`, `type`, `label` — it does NOT reject unknown properties on `fairInputs`. The `tef` and `vulnerability` fields pass through transparently.

**Result:** PASS

### Scenario 4: Mixed-Mode Tree (Direct + Decomposed Leaves)

**Setup:** Tree with 3 leaves: Leaf A (direct LEF), Leaf B (TEF x Vulnerability), Leaf C (direct LEF).

**Code trace:** `fairEngine.ts:120-126` — the mode check is per-node (`if (node.fairInputs.tef && node.fairInputs.vulnerability)`). Each leaf is evaluated independently. The gate aggregation (`fairEngine.ts:146-149`) receives a `lef` value from each child regardless of how it was computed.

**Result:** PASS

### Scenario 5: JSON Export Includes tef/vulnerability

**Code trace:** `fileIO.ts` exports scenarios via `JSON.stringify(scenario)`. Since `tef` and `vulnerability` are regular properties on the `fairInputs` object (not methods or symbols), they are serialized when present and absent when not.

**Result:** PASS

### Scenario 6: JSON Import of Phase 2 Scenario (No tef/vulnerability)

**Code trace:** `validate.ts:142-214` — `validateScenario()` checks core fields (`id`, `name`, `nodes`, `edges`, `simulationConfig`) and `controlAssignments`. It does NOT require `tef` or `vulnerability` on nodes. A Phase 2 export with only `lef` on leaf nodes passes validation without errors.

Node validation (`validate.ts:171-181`) checks `id`, `type`, `label` — does not inspect `fairInputs` contents beyond presence.

**Result:** PASS

### Scenario 7: SimulationResult.samples Absent (Pre-Phase 3 Results)

**Code trace:** `shared/src/index.ts:68` — `samples?: number[]` is optional. Pre-Phase 3 scenarios have `results` without `samples`. Frontend components referencing `results.samples` must check for existence.

The LEC component (Wave C, not yet built) should display an informational message when `samples` is undefined. This is specified in `spec-loss-exceedance.md §9` acceptance criteria.

**Result:** PASS (type-level backward compatibility confirmed; UI behavior deferred to Wave C)

### Scenario 8: SensitivityResult Not Persisted

**Code trace:** `shared/src/index.ts:159-186` defines `SensitivityResult` and `SensitivityItem` as exported types, but they are NOT fields on the `Scenario` interface (`shared/src/index.ts:73-87`). The sensitivity result lives only in the Zustand `simulationStore` at runtime.

IndexedDB stores `Scenario` objects. Since `SensitivityResult` is not on `Scenario`, it is never persisted. Confirmed by design.

**Result:** PASS

### Scenario 9: ComparisonState Not Persisted

**Code trace:** Per `spec-scenario-comparison.md §4.2`, `ComparisonState` is a new Zustand store (`useComparisonStore`) that is ephemeral. It holds `selectedScenarioIds`, `referenceIndex`, and `isComparing`. None of these are on the `Scenario` type or stored in IndexedDB.

**Result:** PASS (by design — store not yet implemented, but constraint is architectural)

### Scenario 10: Phase 2 Scenario Opens in Phase 3 UI Without Errors

**Deferred.** Requires Wave C UI components (TASK-320 through TASK-324) to be implemented. Validation will verify:
- Property panel renders direct LEF mode by default (no tef/vulnerability toggle active)
- Results drawer shows existing tabs (Summary, Histogram) without errors
- Sensitivity and Exceedance tabs handle missing data gracefully
- No JavaScript console errors on load

**Result:** DEFERRED (pending Wave C)

---

## Existing Test Coverage

| Scenario | Automated Test | Status |
|----------|---------------|--------|
| 1 (Direct LEF) | fairEngine unit tests | Covered |
| 2 (controlAssignments) | validate.ts unit tests | Covered |
| 3 (TEF x Vuln) | fairEngine unit tests (TEF path) | Covered |
| 4 (Mixed mode) | -- | Recommend adding |
| 5-6 (Export/Import) | -- | Recommend adding in TASK-332 |
| 7 (samples absent) | -- | Recommend adding in TASK-332 |
| 10 (UI) | -- | Recommend Playwright e2e in TASK-332 |

---

## Handoff Notes

- **@test (TASK-332):** Recommend adding automated tests for scenarios 4-7. See test coverage table above.
- **@frontend (Wave C):** Scenario 10 validation will be completed once UI components are in place. Ensure graceful degradation for missing `samples` and absent `tef`/`vulnerability`.
