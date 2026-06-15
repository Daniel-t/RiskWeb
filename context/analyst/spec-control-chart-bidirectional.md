---
id: SPEC-CONTROLCHART
status: approved
priority: medium
assigned: "@analyst"
reviewers: ["@frontend", "@ux", "@secarch"]
modifies:
  - shared/src/index.ts
  - frontend/src/workers/sensitivityEngine.ts
  - frontend/src/components/Simulation/TornadoChart.tsx
  - frontend/src/components/Simulation/SensitivityPanel.tsx
  - frontend/src/components/Simulation/ShapleyChart.tsx (new)
---

# SPEC-CONTROLCHART: Bidirectional Control Impact + Shapley Attribution

## 1. Problem Statement

The current Control Impact visualization (TornadoChart in `controlToggle` mode) shows only **marginal impact** -- the ALE increase when each control is individually disabled while all others remain active. Users cannot see:

- What a control achieves **on its own** (standalone effectiveness)
- The **diminishing returns** of defense-in-depth (multiplicative stacking)
- A **fair attribution** of combined risk reduction across all controls

## 2. Solution

Two new chart views replacing the current control toggle tornado, accessible as tabs in the Sensitivity panel:

1. **Control Impact (Bidirectional)** -- Standalone (left) vs. Marginal (right) bars per control
2. **Shapley Attribution** -- Fair-share decomposition where bars sum exactly to total combined reduction

### 2.1 Tab Structure

The Sensitivity panel gains three tabs (replacing the current two-mode toggle):

| Tab | Description | Engine Function |
|-----|-------------|-----------------|
| Control Impact | Bidirectional standalone vs. marginal | `runControlBidirectional()` |
| Shapley Attribution | Fair-share Shapley values | `runShapleyAttribution()` |
| Input Sensitivity | Existing OAT tornado (unchanged) | `runOATSweep()` |

## 3. Chart 1: Bidirectional Control Impact

### 3.1 Visual Layout

```
              Standalone Impact    |    Marginal Impact
              (control alone)      |    (with other controls)
                                   |
  MFA         ==================== | ============          $45K / $28K
  Email Filt  ===============      | =========             $32K / $19K
  WAF         ===========          | ======                $24K / $13K
  IDS         ========             | ====                  $17K / $8K
              ---------------------0---------------------
  TOTAL COMBINED                   |  [===================] $85K
```

### 3.2 Bar Definitions

| Bar | Direction | Formula | Meaning |
|-----|-----------|---------|---------|
| Standalone (left) | Extends left from 0 | `ALE_no_controls - ALE_only_this_control` | Risk reduction from this control alone, no other controls present |
| Marginal (right) | Extends right from 0 | `ALE_without_this_control - ALE_all_controls` | Additional risk reduction this control provides when layered with all others |

- All values are **positive** (dollars of risk reduced; bigger = better)
- Standalone >= Marginal always holds (multiplicative stacking guarantees this)

### 3.3 Total Combined Row

A summary row at the bottom: `ALE_no_controls - ALE_all_controls`

This anchors expectations: the sum of individual bars does NOT equal this total (neither standalone nor marginal sums will match). The total row prevents misinterpretation.

### 3.4 Display Rules

- **Sort order:** By marginal impact (right bar) descending
- **All controls shown:** Including near-zero impact (no hiding/filtering)
- **Unified ALE impact:** No distinction between LEF-reducing and LM-reducing controls; all measured by ALE reduction
- **Colors:** Lighter blue (`#93c5fd`) for standalone, darker blue (`#3b82f6`) for marginal
- **Dollar labels:** Both values per row (`$45K / $28K` format)
- **Tooltips:** Control name, standalone $, marginal $, standalone %, marginal %
  - Percentages computed as: `(reduction / ALE_no_controls) * 100`

### 3.5 Simulation Runs

For N assigned/enabled controls: **2N + 2 simulation runs**

| Run Type | Description | Count |
|----------|-------------|-------|
| Baseline | All controls disabled | 1 |
| All ON | All controls enabled | 1 |
| Solo | Only control_i enabled | N |
| Toggle | All except control_i enabled | N |

**Optimization:** The existing dual-pass simulation already produces `baselineResult` (no controls) and `result` (all controls). Reuse these cached ALE means to eliminate 2 redundant runs, reducing effective new work to 2N runs.

## 4. Chart 2: Shapley Attribution

### 4.1 Background

Shapley values (from cooperative game theory) provide the unique "fair" way to attribute a combined outcome among contributors. Each control's Shapley value is its average marginal contribution when added to every possible subset of other controls.

**Key property:** Shapley values sum exactly to the total combined reduction. This makes them directly interpretable as "fair share" percentages.

### 4.2 Visual Layout

```
  Shapley Fair Attribution
  (each control's fair share of total reduction)
                                                          [Sampled]
  MFA         ========================                    $34K (40%)
  Email Filt  ===================                         $25K (29%)
  WAF         =============                               $16K (19%)
  IDS         ========                                    $10K (12%)
              ----------------------------------------
  TOTAL       ========================================    $85K (100%)
```

### 4.3 Shapley Algorithm

**Exact computation (N <= configurable threshold, default 10):**

For each control C_i, iterate all subsets S of the other N-1 controls:

```
Shapley(C_i) = SUM over S subset of N\{i}:
    [ |S|! * (N-|S|-1)! / N! ] * [ v(S union {i}) - v(S) ]
```

where `v(S)` = ALE reduction from subset S = `ALE_no_controls - ALE_with_subset_S`

Cache simulation results per unique subset. Total unique subsets = 2^N.

**Sampled computation (N > threshold):**

1. Generate M random permutations of all N controls (default M = 200)
2. For each permutation, walk through adding controls one by one
3. Record each control's marginal contribution (ALE change when added)
4. Average each control's contributions across all M permutations
5. Normalize so sum = total combined reduction (correct for sampling noise)

Cache subset ALE results across permutations to avoid redundant simulation runs.

### 4.4 Display Rules

- **Sort order:** By Shapley value descending
- **Percentage labels:** `shapleyValue / totalCombinedReduction * 100`
- **Sampling indicator:** When N > exact threshold, show badge: `Sampled (M permutations)`
- **Total row:** Confirms bars sum to total combined reduction
- **Color:** Single blue shade (`#3b82f6`)
- **Configurable threshold:** Default 10; stored in simulation config (future: expose in settings UI)

## 5. Types

```typescript
// -- Bidirectional Control Impact --

interface ControlImpactItem {
  controlId: string;
  label: string;
  standaloneReduction: number;  // ALE_no_controls - ALE_only_this
  marginalReduction: number;    // ALE_without_this - ALE_all
}

interface ControlImpactResult {
  items: ControlImpactItem[];
  totalCombinedReduction: number;  // ALE_no_controls - ALE_all
  aleNoControls: number;
  aleAllControls: number;
}

// -- Shapley Attribution --

interface ShapleyItem {
  controlId: string;
  label: string;
  shapleyValue: number;       // Fair-share ALE reduction in dollars
  percentage: number;          // shapleyValue / totalCombinedReduction * 100
}

interface ShapleyResult {
  items: ShapleyItem[];
  totalCombinedReduction: number;
  aleNoControls: number;
  aleAllControls: number;
  exact: boolean;              // true = exact computation, false = sampled
  sampleCount?: number;        // Number of permutations (when sampled)
}
```

## 6. Edge Cases

| Case | Behavior |
|------|----------|
| Single control | Bidirectional: both bars equal. Shapley: 100% attribution. |
| No controls assigned | Empty state message on both tabs |
| Control with zero impact | Row shown, no visible bar, "$0" label |
| Negative values (float noise) | Clamp to 0 |
| Shapley sum drift (sampling) | Normalize values so they sum exactly to totalCombinedReduction |
| All controls on same node | Works correctly -- each solo/toggle run re-evaluates the full tree |
| Control on multiple nodes | Standalone/marginal capture combined effect across all assignments |

## 7. Acceptance Criteria

1. **AC-1:** Sensitivity panel shows three tabs: Control Impact, Shapley Attribution, Input Sensitivity
2. **AC-2:** Control Impact tab displays bidirectional bars with standalone (left) and marginal (right) per control
3. **AC-3:** Left bars >= right bars for every control (defense-in-depth property)
4. **AC-4:** Total combined row shown at bottom of both charts
5. **AC-5:** Shapley values sum to total combined reduction (exact match for exact mode; within rounding for sampled)
6. **AC-6:** Sampled indicator displayed when N exceeds exact threshold
7. **AC-7:** Dollar labels and percentage tooltips on all bars
8. **AC-8:** Controls sorted by marginal impact (Control Impact) / Shapley value (Shapley Attribution) descending
9. **AC-9:** Empty state message when no controls are assigned
10. **AC-10:** Existing Input Sensitivity (OAT) tab unchanged
