---
id: SPEC-LOSS-EXCEEDANCE
title: Loss Exceedance Curve Specification
status: draft
assigned: analyst
epic: E3.5
depends_on: [SPEC-FAIR-SIMPLIFIED]
created: 2026-05-21
modifies: context/analyst/spec-loss-exceedance.md
---

# Loss Exceedance Curve Specification

This document specifies the Loss Exceedance Curve (LEC) visualization -- a complementary CDF that shows the probability of annual losses exceeding any given dollar amount. This is the standard format for communicating risk appetite and residual risk to leadership.

Implementors: @frontend (visualization component, results panel integration).

---

## 1. Motivation

The existing histogram shows the *shape* of the ALE distribution, but security architects and risk committees need a different framing:

> "What is the probability that our annual losses from this scenario exceed $1M?"

The loss exceedance curve answers this directly. It maps every loss level to an exceedance probability, enabling:

- **Risk appetite comparison:** Overlay the organization's risk appetite threshold (e.g., "we accept < 10% chance of exceeding $500K") against the curve.
- **Before/after visualization:** Show how controls shift the entire loss distribution leftward.
- **VaR-style reporting:** Read off "Value at Risk" at any confidence level (e.g., 95th percentile VaR).

---

## 2. Calculation

### 2.1 From Monte Carlo Samples

The LEC is computed directly from the existing ALE sample array -- **no additional simulation required**.

Given N ALE samples from a simulation run:

1. Sort samples ascending: `sorted[0] <= sorted[1] <= ... <= sorted[N-1]`
2. For each sample `sorted[i]`, the exceedance probability is: `P(Loss > sorted[i]) = 1 - (i + 1) / N`
3. Plot as a step function or smooth curve: X-axis = loss amount ($), Y-axis = exceedance probability.

### 2.2 Equivalent Formulation

The exceedance probability at loss level `x` is the fraction of samples exceeding `x`:

```
P(Loss > x) = count(ALE_k > x) / N
```

This is the **complementary empirical CDF** (also called the survival function).

### 2.3 Interpolation

For smooth rendering, the visualization uses the sorted sample points directly (step function at each sample). With 10,000+ iterations, this produces a visually smooth curve without interpolation.

For reduced rendering load, the curve can be downsampled to ~500 evenly-spaced points along the X-axis, computing exceedance probability at each via binary search on the sorted array.

---

## 3. Data Model

### 3.1 No New Types Required

The LEC is computed on-the-fly from existing `SimulationResult` data. However, the current `SimulationResult` only stores summary statistics (mean, stddev, percentiles), not raw samples.

**Required change:** The simulation worker must make ALE samples available for LEC rendering. Two options:

**Option A (recommended): Store samples in result.**
```typescript
export interface SimulationResult {
  // ... existing fields ...
  samples?: number[];  // Raw ALE samples, sorted ascending. Optional for backward compat.
}
```

Storing 10,000 sorted numbers costs ~80KB of memory -- negligible. For 1M iterations, consider storing only every Nth sample (e.g., 10,000 evenly-spaced samples from 1M).

**Option B: Recompute from worker.**
Keep samples in the worker and expose a message to request LEC points. More complex, no real benefit.

**Decision: Option A.** Add `samples?: number[]` to `SimulationResult`.

### 3.2 Sample Storage Limits

| Iterations | Stored Samples | Strategy |
|-----------|---------------|----------|
| <= 10,000 | All | Direct storage |
| 10,001 - 100,000 | 10,000 | Every Nth sample (evenly spaced from sorted array) |
| 100,001 - 1,000,000 | 10,000 | Every Nth sample |

The downsampling preserves the distribution shape while bounding memory. The percentile accuracy at 10,000 samples is within 1% of the true distribution.

### 3.3 Baseline Samples

When dual simulation is active (baseline vs. controlled), both `result.samples` and `baselineResult.samples` are stored, enabling overlay.

---

## 4. Visualization

### 4.1 Chart Layout

- **X-axis:** Loss amount in dollars (same formatting as histogram: $K, $M, $B).
- **Y-axis:** Exceedance probability (0% to 100%, or 0.0 to 1.0).
- **Curve direction:** Starts at top-left (low loss, high probability of exceeding) and descends to bottom-right (high loss, low probability).

### 4.2 Overlay Mode

When both baseline and controlled results are available:

| Curve | Style | Color |
|-------|-------|-------|
| Baseline | Dashed line, 60% opacity | Gray (#9CA3AF) |
| Controlled | Solid line | Blue (#3B82F6) |

The gap between curves represents the risk reduction from controls. A larger leftward shift = more effective control portfolio.

### 4.3 Key Readouts

Display as annotations or a side panel:

| Readout | Description |
|---------|-------------|
| VaR 90% | "90% confidence: losses will not exceed $X" (read from P90 on the curve) |
| VaR 95% | "95% confidence: losses will not exceed $X" (read from P95) |
| Expected Loss | Mean ALE (vertical line or marker on X-axis) |
| Median Loss | P50 ALE |

These use the already-computed percentiles from `SimulationResult.summary.percentiles`. No additional computation needed (though the visualization can also read them from the curve interactively).

### 4.4 Interactive Behavior

- **Hover:** Show crosshair with tooltip: "P(Loss > $X) = Y%" at the cursor position.
- **Click-to-pin (optional):** Click on the curve to pin a readout point (e.g., pin the risk appetite threshold).
- **Responsive:** Same ResizeObserver pattern as ALEHistogram.

### 4.5 Risk Appetite Line (Future Enhancement)

A horizontal dashed line at a user-defined probability threshold (e.g., 10%) would show the maximum loss the organization accepts at that confidence level. This is a future enhancement requiring a risk appetite field on the Scenario -- not implemented in Phase 3.

---

## 5. Integration

### 5.1 Results Drawer

Add the LEC as a new tab or panel in the results drawer:

| Tab | Content |
|-----|---------|
| Summary | Existing stats table (unchanged) |
| Histogram | Existing ALE histogram (unchanged) |
| **Exceedance** | **New: Loss Exceedance Curve** |
| Sensitivity | New: Tornado charts (from spec-sensitivity.md) |

### 5.2 Component

New component: `LossExceedanceCurve.tsx` in `frontend/src/components/Simulation/`.

Reuse D3 patterns from `ALEHistogram.tsx`:
- Same responsive container pattern (ResizeObserver)
- Same X-axis dollar formatting utilities
- Same color scheme for baseline/controlled overlay
- Same tooltip implementation pattern

---

## 6. Worked Example

**Scenario:** 10,000 iterations, controlled simulation.

**Sorted ALE samples (illustrative subset):**

| Percentile | ALE |
|-----------|-----|
| P10 | $12,000 |
| P25 | $28,000 |
| P50 (median) | $65,000 |
| P75 | $142,000 |
| P90 | $310,000 |
| P95 | $480,000 |
| P99 | $920,000 |

**Reading the curve:**

- "There is a 50% chance annual losses exceed $65,000" (read at P50)
- "There is a 10% chance annual losses exceed $310,000" (read at P90)
- "There is a 5% chance annual losses exceed $480,000" (read at P95)
- "There is a 1% chance annual losses exceed $920,000" (read at P99)

**Board-level summary:** "Our 95th percentile VaR for this scenario is $480K. With the proposed control investments, this drops to $280K."

---

## 7. Edge Cases

| Case | Behavior |
|------|----------|
| All samples identical (constant distributions) | Curve is a vertical step at that value. Display but note "deterministic scenario." |
| Very few iterations (< 100) | Curve appears jagged. Show warning: "Increase iterations for smoother exceedance curve." |
| Samples include $0 (LEF=0 iterations) | Valid. Curve starts below 100% on the Y-axis (some iterations have zero loss). |
| Very wide distribution (range spans 6+ orders of magnitude) | Use log scale on X-axis. Auto-detect when max/min ratio > 1000. |

---

## 8. Out of Scope

- **Risk appetite threshold line:** Requires a risk appetite field on the Scenario. Deferred.
- **Multi-scenario overlay on LEC:** Handled by the scenario comparison feature (spec-scenario-comparison.md).
- **Annual aggregate loss (multiple events):** The current ALE already represents annualized expected loss. A true aggregate loss distribution (summing multiple events per year) is a more complex simulation model -- deferred.
- **PDF export of LEC:** Deferred to Phase 4 (PDF report generation).
