# Wave D Validation Report: Controls Impact Correctness

**Task:** TASK-222
**Date:** 2026-05-21
**Author:** @analyst
**Dependencies:** TASK-218 (engine), TASK-220 (save/load), TASK-221 (comparison view)
**Method:** Hand-calculated expected values verified against engine code in `frontend/src/workers/fairEngine.ts` and `frontend/src/workers/simulation.worker.ts`

---

## Validation Summary

| # | Scenario | Expected ALE | Verified Against | Status |
|---|----------|-------------|------------------|--------|
| 1 | No Controls (Baseline) | $500,000 | Code trace | PASS |
| 2 | Single Control, LEF Reduction | $400,000 | Code trace | PASS |
| 3 | Two Controls, Multiplicative Stacking | $100,000 | Code trace | PASS |
| 4 | Disabled Control Has No Effect | $1,000,000 | Code trace | PASS |
| 5 | Override Takes Precedence | $500,000 | Code trace | PASS |
| 6 | LM Reduction (Scenario-Level) | $2,000,000 | Code trace | PASS |
| 7 | Combined LEF + LM Reduction | $500,000 | Code trace | PASS |
| 8 | Multi-Node Tree with Controls | **$600,000** (corrected) | Code trace | PASS (with correction) |
| 9 | Baseline vs. Controlled Comparison | 90% reduction | DEFERRED | DEFERRED — requires TASK-221 UI |
| 10 | Save/Load Round-Trip | Assignments preserved | DEFERRED | DEFERRED — requires manual UI test |

**Overall: 8/8 code-verifiable scenarios PASS. 2 scenarios deferred for UI validation.**

---

## Detailed Scenario Results

### Scenario 1: No Controls (Baseline Sanity Check)

**Setup:** Single leaf, LEF = Constant(5.0), LM = Constant($100,000), 10,000 iterations

**Code trace** (`fairEngine.ts:107-130`):
- Leaf node: `lef = sampleDistribution(Constant(5.0))` → 5.0
- No assignments → `combinedPassThrough` logic skipped
- `applyLmReductions()` receives empty `lmAssignments` → returns baseLm unchanged
- ALE = 5.0 × $100,000 = **$500,000**

**Expected:** $500,000 | **Result: PASS**

Constant distributions produce zero variance → all percentiles = $500,000, stddev ≈ 0.

---

### Scenario 2: Single Control, LEF Reduction Only

**Setup:** Single leaf, LEF = Constant(10.0), LM = Constant($200,000), Control A: lefReduction = Constant(0.80), assigned & enabled

**Code trace** (`fairEngine.ts:116-128`):
1. `lef = 10.0`
2. Assignment found, enabled=true, control found
3. `reductionDist = assignment.lefReductionOverride ?? control.lefReduction` → Constant(0.80)
4. `reduction = 0.80`
5. `combinedPassThrough = 1 * (1 - max(0, min(1, 0.80))) = 1 * 0.20 = 0.20`
6. `combinedPassThrough = max(0, min(1, 0.20))` → 0.20
7. `lef = 10.0 * 0.20 = 2.0`
8. ALE = 2.0 × $200,000 = **$400,000**

**Expected:** $400,000 | **Result: PASS**

---

### Scenario 3: Two Controls, Multiplicative Stacking

**Setup:** Single leaf, LEF = Constant(10.0), LM = Constant($100,000), Control A: lefReduction = Constant(0.80), Control B: lefReduction = Constant(0.50), both assigned & enabled

**Code trace** (`fairEngine.ts:116-128`):
1. `lef = 10.0`
2. Loop over assignments:
   - Control A: `reduction=0.80`, `combinedPassThrough = 1 * (1-0.80) = 0.20`
   - Control B: `reduction=0.50`, `combinedPassThrough = 0.20 * (1-0.50) = 0.10`
3. `combinedPassThrough = max(0, min(1, 0.10))` → 0.10
4. `lef = 10.0 * 0.10 = 1.0`
5. ALE = 1.0 × $100,000 = **$100,000**

**Expected:** $100,000 | **Result: PASS**

Validates multiplicative stacking per TASK-203 section 4.1.

---

### Scenario 4: Disabled Control Has No Effect

**Setup:** Single leaf, LEF = Constant(10.0), LM = Constant($100,000), Control A: lefReduction = Constant(0.80), enabled=false

**Code trace** (`fairEngine.ts:119`):
1. `lef = 10.0`
2. Assignment found, `assignment.enabled = false` → `continue` (skipped)
3. `combinedPassThrough` remains 1 (no controls applied)
4. `lef = 10.0 * 1 = 10.0`
5. ALE = 10.0 × $100,000 = **$1,000,000**

**Expected:** $1,000,000 | **Result: PASS**

---

### Scenario 5: Override Takes Precedence

**Setup:** Single leaf, LEF = Constant(10.0), LM = Constant($100,000), Control A base: lefReduction = Constant(0.80), Assignment override: lefReductionOverride = Constant(0.50)

**Code trace** (`fairEngine.ts:122`):
1. `reductionDist = assignment.lefReductionOverride ?? control.lefReduction`
2. `lefReductionOverride` is defined → uses Constant(0.50), ignores base Constant(0.80)
3. `reduction = 0.50`, `combinedPassThrough = 1 * (1-0.50) = 0.50`
4. `lef = 10.0 * 0.50 = 5.0`
5. ALE = 5.0 × $100,000 = **$500,000**

**Expected:** $500,000 | **Result: PASS**

The `??` (nullish coalescing) operator correctly prioritizes override when present.

---

### Scenario 6: LM Reduction (Scenario-Level)

**Setup:** Single leaf, LEF = Constant(5.0), LM = Constant($1,000,000), Control A: lefReduction = Constant(0.0), lmReduction = Constant(0.60)

**Code trace:**
- LEF path (`fairEngine.ts:116-128`): `reduction=0.0`, `combinedPassThrough = 1*(1-0) = 1.0`, `lef = 5.0 * 1.0 = 5.0` (no LEF effect)
- LM path (`fairEngine.ts:172-191`): `reduction=0.60`, `lmPassThrough = 1*(1-0.60) = 0.40`, `lm = $1,000,000 * 0.40 = $400,000`
- ALE = 5.0 × $400,000 = **$2,000,000**

**Expected:** $2,000,000 | **Result: PASS**

LM reduction is applied scenario-wide via `applyLmReductions()`, not per-node.

---

### Scenario 7: Combined LEF + LM Reduction

**Setup:** Single leaf, LEF = Constant(10.0), LM = Constant($500,000), Control A: lefReduction = Constant(0.80), lmReduction = Constant(0.50)

**Code trace:**
- LEF: `reduction=0.80`, `passThrough=0.20`, `lef = 10.0 * 0.20 = 2.0`
- LM: `reduction=0.50`, `passThrough=0.50`, `lm = $500,000 * 0.50 = $250,000`
- ALE = 2.0 × $250,000 = **$500,000**

**Expected:** $500,000 | **Result: PASS**

Both LEF and LM reductions sampled independently per iteration; with constant distributions, the result is deterministic.

---

### Scenario 8: Multi-Node Tree with Controls on Some Leaves

**Setup:** OR gate root, Leaf A: LEF=Constant(4.0) with Control X (lefReduction=Constant(0.75)), Leaf B: LEF=Constant(6.0) no controls, LM=Constant($100,000)

**Code trace** (`fairEngine.ts:141-156`):

1. Leaf A: `lef=4.0`, control applied: `passThrough = 1-0.75 = 0.25`, `lef = 4.0 * 0.25 = 1.0`
2. Leaf B: `lef=6.0`, no controls
3. OR gate aggregation:
   - `anyAboveOne = true` (Leaf B LEF=6.0 > 1)
   - `maxLEF = max(1.0, 6.0) = 6.0`
   - `clampedProduct = (1 - min(1.0, 1)) × (1 - min(6.0, 1)) = (1-1) × (1-1) = 0 × 0 = 0`
   - `combinedLEF = (1 - 0) × 6.0 = 6.0`
4. ALE = 6.0 × $100,000 = **$600,000**

**CORRECTION from TASK-222 spec:** The task spec assumed OR gate = simple summation (Root LEF=7.0, ALE=$700,000). The actual implementation uses the clamped inclusion-exclusion formula from `spec-fair-simplified-model.md` section 3.2, which yields Root LEF=6.0.

**Note:** When Leaf A has LEF=1.0 (exactly at the clamp boundary), `1-min(1.0,1) = 0`, which zeroes out Leaf A's contribution entirely. This is mathematically correct for the inclusion-exclusion model (LEF=1.0 means certainty, so the OR gate is already saturated from that child alone), but the scaling by maxLEF (6.0) preserves the frequency magnitude from Leaf B.

**Expected (corrected):** $600,000 | **Result: PASS**

---

### Scenario 9: Baseline vs. Controlled Comparison

**Setup:** Scenario 3 setup, verify comparison view shows 90% reduction

**Code trace** (`simulation.worker.ts:42-62`):
- Dual simulation triggered when `hasEnabledAssignments = true`
- Pass 1 (baseline): `controlAssignments` stripped → LEF=10.0, ALE=$1,000,000
- Pass 2 (controlled): assignments applied → LEF=1.0, ALE=$100,000
- Reduction = ($1,000,000 - $100,000) / $1,000,000 = 90%

**Engine logic verified.** UI validation (three-tab drawer, overlay histogram) requires TASK-221 to be complete.

**Status: DEFERRED** — pending TASK-221 implementation + manual UI verification

---

### Scenario 10: Save/Load Round-Trip

**Code trace:**
- Export (`fileIO.ts`): `_exportedControls` populated from referenced controlIds
- Import (`fileIO.ts`): `_exportedControls` extracted before validation, returned as `importedControls`
- Validation (`validate.ts`): `controlAssignments` validated for structure, orphaned nodeIds removed with warnings, duplicates deduplicated

**Engine logic verified.** Full round-trip (export → clear → import → re-run) requires manual UI testing.

**Status: DEFERRED** — pending manual UI verification

---

## Errata

### TASK-222 Scenario 8 Expected Value Correction

The original task spec stated:
> Root LEF = 1.0 + 6.0 = 7.0, Mean ALE = $700,000

This assumed OR gate = summation. Per `spec-fair-simplified-model.md` and the implementation, OR gates use clamped inclusion-exclusion. The correct expected values are:
> Root LEF = 6.0, Mean ALE = $600,000

No bug filed — the implementation matches the FAIR model spec. The task spec's expected value was incorrect.

---

## Existing Test Coverage

The following automated tests in `frontend/src/workers/__tests__/` already cover equivalent scenarios:

| Scenario | Covered By | File |
|----------|-----------|------|
| 1 (No controls) | Basic ALE calculation tests | `integration.test.ts` |
| 2 (Single control) | `single control impact` | `integration.test.ts:90-101` |
| 3 (Multiplicative stacking) | `multiple controls stacking` | `integration.test.ts:103-120`, `fairEngine.test.ts:152-180` |
| 4 (Disabled control) | `disabled controls` | `integration.test.ts:122-130`, `fairEngine.test.ts:125-150` |
| 5 (Override) | `override effects` | `integration.test.ts:132-145`, `fairEngine.test.ts:256-284` |
| 6 (LM reduction) | `LM reductions` | `fairEngine.test.ts:341-445` |
| 7 (Combined LEF+LM) | Partially covered | Individual LEF and LM tests exist |
| 8 (Multi-node OR gate) | NOT covered with controls | Recommend adding |

### Recommended Additional Tests for @test

1. **Scenario 7 (combined LEF+LM):** Single integration test verifying both channels in one simulation run
2. **Scenario 8 (multi-node + controls):** Integration test with OR gate + per-node control assignments
3. **Scenario 9 (dual simulation):** Verify baseline vs. controlled result objects returned by worker

---

## Handoff Notes

### For @test (TASK-228 or new task)
- Scenarios 1-8 verified at the code level; encode scenarios 7 and 8 as new automated tests
- Scenarios 9-10 require manual/E2E testing once TASK-221 is complete

### For @frontend
- No bugs found. All engine math matches specifications.
- Scenario 8 correction is a spec errata, not an implementation bug.
