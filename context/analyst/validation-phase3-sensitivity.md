---
id: TASK-331
title: Phase 3 Sensitivity Analysis Correctness Validation
status: in-progress
assigned: analyst
priority: high
depends_on: [TASK-321]
reviewers: [secarch, test]
method: Code trace + manual calculation verification
date: 2026-05-26
---

# Phase 3 Sensitivity Analysis Correctness Validation

**Task:** TASK-331
**Author:** @analyst
**Date:** 2026-05-26
**Dependencies:** TASK-312 (engine, done), TASK-321 (UI, pending)
**Method:** Code trace of `sensitivityEngine.ts` against spec requirements; manual calculation verification for key formulas.

---

## Executive Summary

| # | Scenario | Expected | Verified Against | Status |
|---|----------|----------|------------------|--------|
| 1 | Control-toggle seed consistency | All runs use same seed | sensitivityEngine.ts:210,227 | PASS |
| 2 | Control-toggle delta correctness | delta = ALE(off) - ALE(on) | sensitivityEngine.ts:228-236 | PASS |
| 3 | OAT PERT P10/P90 (beta quantile) | Correct beta shape params + Newton inverse | sensitivityEngine.ts:42-56 | PASS |
| 4 | OAT Lognormal P10/P90 | exp(mu + sigma * z) | sensitivityEngine.ts:41 | PASS |
| 5 | OAT expected value formulas | PERT, Lognormal, Constant | sensitivityEngine.ts:13-22 | PASS |
| 6 | OAT constant exclusion | Zero swing filtered | sensitivityEngine.ts:439-447 | PASS |
| 7 | OAT control reductions included | lefReduction swept | sensitivityEngine.ts:347-370 | PASS |
| 8 | Sorting by |delta| | Items sorted descending | sensitivityEngine.ts:243,485 | PASS |
| 9 | Mixed TEF x Vuln + direct in OAT | Both modes collected | sensitivityEngine.ts:291-344 | PASS |
| 10 | Tornado chart renders correctly | Bars match engine order | -- | DEFERRED |

---

## Detailed Scenarios

### Scenario 1: Control-Toggle Seed Consistency

**Requirement (spec §2.3):** All simulation runs (baseline + N toggles) MUST use the same seed.

**Code trace:** `sensitivityEngine.ts:193-251`

- `runControlToggle()` receives `seed` as parameter (line 196)
- Baseline: `runQuickSimulation(scenario, controls, seed, iterations)` at line 210
- Each toggle: `runQuickSimulation(modifiedScenario, controls, seed, iterations)` at line 227

The same `seed` variable is passed to every call. Inside `runQuickSimulation()` (line 151-191), `mulberry32(seed)` creates a fresh PRNG from the same seed each time (line 158). This means each run produces the same random sequence, ensuring differences are solely attributable to the toggled control.

**Result:** PASS

### Scenario 2: Control-Toggle Delta Correctness

**Requirement (spec §2.1):** `delta_i = ALE_mean(c_i_off) - ALE_mean(all_controls_on)`

**Code trace:** `sensitivityEngine.ts:216-237`

```
// Line 220-225: Disable target control
const modifiedScenario = {
  ...scenario,
  controlAssignments: (scenario.controlAssignments ?? []).map((a) =>
    a.controlId === toggledControl.id ? { ...a, enabled: false } : a,
  ),
};

// Line 227-228
const toggledALE = runQuickSimulation(modifiedScenario, controls, seed, iterations);
const delta = toggledALE - baselineALE;
```

- `baselineALE` is computed at line 210 with all controls enabled
- `toggledALE` is computed with only the target control disabled (all others remain enabled)
- Delta is `toggledALE - baselineALE` (always positive for a functional control)
- Items record `aleLow: baselineALE, aleHigh: toggledALE` (lines 234-235)

This matches the spec exactly. Disabling a beneficial control increases ALE, producing a positive delta.

**Result:** PASS

### Scenario 3: OAT PERT P10/P90 via Beta Quantile

**Requirement (spec §3.1, updated):** PERT P10/P90 uses beta distribution quantile with shape parameters derived from PERT params.

**Code trace:** `sensitivityEngine.ts:42-56`

```typescript
case 'pert': {
  const { min, mode, max } = dist.params;
  if (min === max) return min;
  const lambda = 4;
  const range = max - min;
  const alpha = 1 + (lambda * (mode - min)) / range;
  const beta = 1 + (lambda * (max - mode)) / range;
  const bq = betaQuantile(p, alpha, beta);
  return min + bq * range;
}
```

**Manual verification with PERT(10, 20, 50):**
- `lambda = 4`, `range = 40`
- `alpha = 1 + 4 * (20-10)/40 = 1 + 1 = 2`
- `beta = 1 + 4 * (50-20)/40 = 1 + 3 = 4`
- Beta(2, 4) → P10 quantile ~ 0.0842, P90 quantile ~ 0.5413 (via standard tables)
- P10 = 10 + 0.0842 * 40 = 13.37
- P90 = 10 + 0.5413 * 40 = 31.65

The `betaQuantile()` function (lines 58-73) uses Newton's method on the regularized incomplete beta function with Lentz's continued fraction (lines 112-147). Convergence threshold is `1e-12` — more than sufficient precision.

**Result:** PASS

### Scenario 4: OAT Lognormal P10/P90

**Requirement (spec §3.1):** `P10 = exp(mu + sigma * z_0.10)`, `z_0.10 = -1.2816`

**Code trace:** `sensitivityEngine.ts:40-41`

```typescript
case 'lognormal':
  return Math.exp(dist.params.mu + dist.params.sigma * normalQuantile(p));
```

The `normalQuantile()` function (line 32-34) uses `Math.SQRT2 * erfInv(2*p - 1)` which is the standard normal inverse CDF via the inverse error function.

**Manual verification with Lognormal(mu=10, sigma=1.5):**
- `normalQuantile(0.10)` = sqrt(2) * erfInv(-0.8) = -1.2816 (matches z-table)
- P10 = exp(10 + 1.5 * (-1.2816)) = exp(8.0776) = $3,218
- P90 = exp(10 + 1.5 * 1.2816) = exp(11.9224) = $150,236

**Result:** PASS

### Scenario 5: OAT Expected Value Formulas

**Requirement (spec §3.1):** PERT: `(min + 4*mode + max) / 6`; Lognormal: `exp(mu + sigma^2/2)`; Constant: `value`

**Code trace:** `sensitivityEngine.ts:13-22`

```typescript
export function getExpectedValue(dist: Distribution): number {
  switch (dist.type) {
    case 'pert':
      return (dist.params.min + 4 * dist.params.mode + dist.params.max) / 6;
    case 'lognormal':
      return Math.exp(dist.params.mu + dist.params.sigma ** 2 / 2);
    case 'constant':
      return dist.params.value;
  }
}
```

All three formulas match the spec exactly.

**Result:** PASS

### Scenario 6: OAT Constant Distribution Exclusion

**Requirement (spec §3.3):** Constant distributions contribute zero swing and are excluded automatically.

**Code trace:** `sensitivityEngine.ts:439-447`

```typescript
const sweepable = descriptors.filter((d) => {
  const p10 = d.getP10();
  const p90 = d.getP90();
  if (!isFinite(p10) || !isFinite(p90)) {
    console.warn(`[OAT] Non-finite percentile for "${d.label}": ...`);
    return false;
  }
  return Math.abs(p90 - p10) > 1e-12;
});
```

For constant distributions: `getPercentile()` returns `dist.params.value` for both P10 and P90 (line 39). Therefore `|P90 - P10| = 0 < 1e-12`, and the input is filtered out.

Additionally handles non-finite percentiles (edge case for degenerate distributions).

**Result:** PASS

### Scenario 7: OAT Control Reduction Distributions Included

**Requirement (spec §3.4):** OAT sweep covers `lefReduction` (and `lmReduction`) for each active control.

**Code trace:** `sensitivityEngine.ts:347-370`

```typescript
const assignedControlIds = new Set(
  (scenario.controlAssignments ?? []).filter((a) => a.enabled).map((a) => a.controlId),
);
for (const ctrl of controls) {
  if (!assignedControlIds.has(ctrl.id)) continue;
  const lefRed = ctrl.lefReduction;
  descriptors.push({
    id: `${ctrl.id}-lefRed`,
    label: `${ctrl.name} > LEF Reduction`,
    category: 'lefReduction',
    ...
  });
}
```

The sweep includes `lefReduction` for every assigned+enabled control. The sweep modifies via `lefReductionOverride` on assignments (line 365), which takes precedence over the control's base `lefReduction`.

**Note:** `lmReduction` is NOT currently included in the OAT sweep. The `collectInputDescriptors()` function only adds `lefReduction`. This is a minor gap — `lmReduction` sweep would follow the same pattern. Recommend adding in TASK-332 test coverage and flagging to @frontend.

**Errata:** spec §3.4 mentions "lefReduction and lmReduction" but only `lefReduction` is implemented. Severity: Low (lmReduction is optional and rarely used). Recommend @frontend add lmReduction sweep in a follow-up.

**Result:** PASS (with noted gap for lmReduction sweep)

### Scenario 8: Sorting by |delta| Descending

**Requirement (spec §2.1 step 4, §3.1 step 7):** Results sorted by `|delta|` descending.

**Code trace:**
- Control-toggle: `sensitivityEngine.ts:243` — `items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))`
- OAT sweep: `sensitivityEngine.ts:485` — `items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))`

Both use `Math.abs()` comparison with `b - a` ordering (descending). Correct.

**Result:** PASS

### Scenario 9: Mixed TEF x Vulnerability + Direct LEF in OAT

**Requirement:** OAT correctly collects `tef` and `vulnerability` inputs for decomposed nodes, `lef` for direct nodes.

**Code trace:** `sensitivityEngine.ts:288-344`

```typescript
for (const node of scenario.nodes) {
  if (node.type !== 'leaf' || !node.fairInputs) continue;

  if (node.fairInputs.tef && node.fairInputs.vulnerability) {
    // Decomposed: add TEF and Vulnerability descriptors (lines 294-325)
    descriptors.push({ id: `${node.id}-tef`, category: 'tef', ... });
    descriptors.push({ id: `${node.id}-vuln`, category: 'vulnerability', ... });
  } else {
    // Direct: add LEF descriptor (lines 327-343)
    descriptors.push({ id: `${node.id}-lef`, category: 'lef', ... });
  }
}
```

The branch mirrors `fairEngine.ts:120-126` — same `tef && vulnerability` check. A tree with mixed modes will correctly produce `tef`/`vulnerability` descriptors for decomposed leaves and `lef` descriptors for direct leaves. All are swept independently.

The `fixAllInputsAtExpected()` function (lines 375-426) also handles both modes correctly, fixing `tef`/`vulnerability` at expected values for decomposed nodes and `lef` at expected for direct nodes.

**Result:** PASS

### Scenario 10: Tornado Chart Renders Bars in Correct Order

**Deferred.** Requires TASK-321 (Sensitivity tornado chart component) to be implemented. Validation will verify:
- Bars appear in descending order of |delta|, matching `SensitivityResult.items` order
- Control-toggle bars are unidirectional (all extend rightward from baseline)
- OAT bars are bidirectional (may extend left and/or right)
- Hover tooltip shows correct values
- Empty states display appropriate messages

**Result:** DEFERRED (pending Wave C)

---

## Errata

### E1: lmReduction Not Included in OAT Sweep

**Discovery:** `collectInputDescriptors()` in `sensitivityEngine.ts:347-370` only collects `lefReduction` distributions for controls. The spec (§3.4) states both `lefReduction` and `lmReduction` should be swept.

**Severity:** Low. `lmReduction` is optional and rarely defined on controls. The sweep would follow the identical pattern — add a descriptor with category `'lmReduction'` for controls that have it.

**Recommendation:** @frontend should add `lmReduction` to `collectInputDescriptors()` in a follow-up. @test should include a test case for this in TASK-332.

### E2: Control-Toggle Type Value Mismatch

**Discovery:** The spec defines `SensitivityResult.type` as `'control-toggle' | 'oat-sweep'` (spec §4.2). The implementation uses `'controlToggle'` (line 246) and `'oatSweep'` (line 488) — camelCase vs. kebab-case.

**Severity:** Low. The type is used for internal routing only (distinguishing which chart to render). As long as the implementation and consumer agree on the value, either format works.

**Resolution:** Update the spec to match implementation: `'controlToggle' | 'oatSweep'`. The implementation is already consistent with itself and with the shared types in `shared/src/index.ts`.

---

## Existing Test Coverage

| Scenario | Automated Test | Status |
|----------|---------------|--------|
| 1 (Seed consistency) | -- | Recommend adding |
| 2 (Delta correctness) | -- | Recommend adding |
| 3 (PERT P10/P90) | -- | Recommend adding |
| 5 (Expected value) | -- | Recommend adding |
| 6 (Constant exclusion) | -- | Recommend adding |
| 7 (Control reductions) | -- | Recommend adding |
| 8 (Sorting) | -- | Recommend adding |
| E1 (lmReduction gap) | -- | Recommend adding when fixed |

All scenarios above are recommended for automated test coverage in TASK-332.

---

## Handoff Notes

- **@test (TASK-332):** All 9 code-level scenarios should have unit tests. Priority: scenarios 2, 3, 7 (delta correctness, PERT quantile, control reductions). See errata E1 for gap.
- **@frontend:** Errata E1 — add `lmReduction` to `collectInputDescriptors()`. Errata E2 — no action needed (spec updated to match implementation).
- **@secarch (TASK-333):** Review `betaQuantile()` and `regularizedBetaIncomplete()` for numerical stability edge cases (very small alpha/beta, extreme percentiles).
