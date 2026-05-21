---
id: SPEC-SCENARIO-COMPARISON
title: Scenario Comparison Specification
status: draft
assigned: analyst
epic: E3.7
depends_on: [SPEC-FAIR-SIMPLIFIED, SPEC-LOSS-EXCEEDANCE]
created: 2026-05-21
modifies: context/analyst/spec-scenario-comparison.md
---

# Scenario Comparison Specification

This document specifies the side-by-side comparison of 2-4 saved scenarios. This enables security architects to compare risk postures across different threat models, control portfolios, or assumptions -- directly supporting investment decision-making and board-level communication.

Implementors: @frontend (comparison view, scenario picker, delta calculations).

---

## 1. Motivation

Security architects frequently need to compare:

- **Current state vs. proposed state:** "How does investing $200K in new controls change our risk profile?"
- **Different threat models:** "Is our phishing scenario riskier than our insider threat scenario?"
- **Assumption sensitivity:** "What if we use the DBIR frequency data instead of our internal estimates?"

The existing baseline-vs-controlled comparison handles within-scenario control toggling. Cross-scenario comparison extends this to arbitrary saved scenarios.

---

## 2. Comparison Model

### 2.1 Eligibility

A scenario is eligible for comparison if:

- It has been saved (exists in IndexedDB).
- It has simulation results (`scenario.results` is defined).

Scenarios without results are shown in the picker but grayed out with a tooltip: "Run simulation first."

### 2.2 Selection

- User selects **2 to 4** scenarios from a picker interface.
- The first selected scenario is the **reference** (baseline for delta calculations).
- Order matters only for delta computation (deltas are relative to the reference).

### 2.3 No Re-Simulation

Comparison uses stored results only. It does NOT re-run simulations. This means:

- Comparison is instant (no computation delay).
- Results may have been generated at different times with different configs (iteration count, seed). This is acceptable -- the comparison shows what was last simulated.
- A warning is shown if scenarios have different iteration counts: "Scenarios were simulated with different iteration counts. Results may not be directly comparable."

---

## 3. Comparison Views

### 3.1 Summary Statistics Table

Side-by-side table with one column per scenario:

| Metric | Scenario A (ref) | Scenario B | Scenario C | Delta B vs A | Delta C vs A |
|--------|-----------------|------------|------------|-------------|-------------|
| Mean ALE | $150,000 | $85,000 | $210,000 | -$65,000 (-43%) | +$60,000 (+40%) |
| Std Dev | $95,000 | $52,000 | $130,000 | | |
| P10 | $32,000 | $18,000 | $45,000 | -$14,000 | +$13,000 |
| P50 | $120,000 | $68,000 | $175,000 | -$52,000 | +$55,000 |
| P90 | $310,000 | $180,000 | $420,000 | -$130,000 | +$110,000 |

Delta columns show absolute difference and percentage change relative to the reference scenario.

Color coding:
- Negative delta (risk reduction): green text
- Positive delta (risk increase): red text
- Near zero (< 5% change): neutral/gray

### 3.2 Overlaid Histograms

Overlay ALE histograms for all selected scenarios on a single chart:

| Scenario | Color | Opacity |
|----------|-------|---------|
| Reference (A) | Gray | 40% |
| Scenario B | Blue (#3B82F6) | 60% |
| Scenario C | Orange (#F59E0B) | 60% |
| Scenario D | Green (#10B981) | 60% |

Use the same bin width across all scenarios (computed from the combined range of all samples). This ensures visual comparability.

Reuse the `ALEHistogram.tsx` pattern but extend to support N overlaid datasets.

### 3.3 Overlaid Loss Exceedance Curves

If `samples` are available on all selected scenarios (from SPEC-LOSS-EXCEEDANCE):

| Scenario | Line Style | Color |
|----------|-----------|-------|
| Reference (A) | Dashed | Gray |
| Scenario B | Solid | Blue |
| Scenario C | Solid | Orange |
| Scenario D | Solid | Green |

This is the most powerful comparison view for risk communication: "Under Scenario A (current state), there's a 15% chance of exceeding $500K. Under Scenario B (proposed controls), that drops to 4%."

### 3.4 Summary Cards

Above the charts, show compact cards for each scenario:

```
[Scenario A: "Current State"]     [Scenario B: "After WAF + MFA"]
Mean: $150,000                    Mean: $85,000
P90:  $310,000                    P90:  $180,000
Controls: 3 active                Controls: 5 active
```

---

## 4. Data Model

### 4.1 No Persistent Storage

Comparison selections are ephemeral -- they live only in the UI state (Zustand store), not in IndexedDB. The user picks scenarios each time they want to compare.

### 4.2 Store

```typescript
interface ComparisonState {
  selectedScenarioIds: string[];  // 0-4 scenario IDs
  referenceIndex: number;         // Index into selectedScenarioIds (default 0)
  isComparing: boolean;           // Whether comparison view is open
}
```

### 4.3 Loaded Data

When comparison is active, the store loads full `Scenario` objects (with results) for all selected IDs from IndexedDB. These are held in memory only while the comparison view is open.

---

## 5. Scenario Picker UI

### 5.1 Layout

A modal or slide-over panel showing the saved scenario list:

- Each row shows: scenario name, last modified date, mean ALE (if simulated), iteration count.
- Checkbox selection (2-4 scenarios).
- Simulated scenarios have a checkmark icon; unsimulated are grayed.
- "Compare" button activates when 2+ scenarios are selected.

### 5.2 Reference Selection

The first selected scenario becomes the reference by default. A small "Set as reference" action on each selected scenario allows the user to change it.

### 5.3 Access Point

The comparison view is accessed from:
- A "Compare Scenarios" button in the scenario list / sidebar.
- Not from within a single scenario's results panel (that's the existing baseline-vs-controlled comparison).

---

## 6. Delta Calculations

### 6.1 Absolute Delta

```
delta = scenario_metric - reference_metric
```

### 6.2 Percentage Delta

```
pct_delta = (scenario_metric - reference_metric) / reference_metric * 100
```

Guard against division by zero: if `reference_metric == 0`, show "N/A" for percentage.

### 6.3 Metrics Compared

| Metric | Source |
|--------|--------|
| Mean ALE | `results.summary.mean` |
| Std Dev | `results.summary.stddev` |
| P10 | `results.summary.percentiles[10]` |
| P50 | `results.summary.percentiles[50]` |
| P90 | `results.summary.percentiles[90]` |

---

## 7. Worked Example

**Scenarios saved in IndexedDB:**

| ID | Name | Mean ALE | P90 | Controls |
|----|------|----------|-----|----------|
| s1 | Current State | $250,000 | $580,000 | 2 |
| s2 | + WAF Investment | $140,000 | $320,000 | 4 |
| s3 | + WAF + MFA | $85,000 | $195,000 | 6 |
| s4 | Insider Threat Model | $420,000 | $1,100,000 | 1 |

**User selects s1 (reference), s2, s3.**

**Summary table:**

| Metric | Current (ref) | + WAF | + WAF + MFA |
|--------|--------------|-------|-------------|
| Mean | $250K | $140K (-44%) | $85K (-66%) |
| P90 | $580K | $320K (-45%) | $195K (-66%) |

**Board narrative:** "The WAF alone reduces expected losses by 44%. Adding MFA on top achieves a 66% reduction, bringing our 90th percentile exposure below $200K."

---

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| Only 1 scenario exists | "Compare" button disabled. Tooltip: "Save at least 2 scenarios to compare." |
| Selected scenario deleted while comparing | Remove from comparison. If < 2 remain, close comparison view. |
| Scenarios with different iteration counts | Show warning banner but allow comparison. |
| Scenario re-simulated while comparison is open | Comparison uses the results loaded at open time. User must re-open to see updated results. |
| Very different ALE scales (e.g., $10K vs $10M) | Histogram uses shared axis encompassing all scenarios. Consider log scale if range > 1000x. |
| No samples stored (pre-Phase 3 scenarios) | LEC overlay unavailable. Show histogram + stats table only. |

---

## 9. Out of Scope

- **Automatic scenario versioning / snapshots:** Each comparison target must be a separately saved scenario. No in-scenario snapshots this phase.
- **Diff of scenario inputs:** Showing which inputs differ between scenarios (e.g., "Scenario B has 2 extra controls"). Useful but adds complexity -- deferred.
- **Merged/combined scenarios:** No aggregation of multiple scenarios into a portfolio view. Deferred.
- **Export comparison as PDF/image:** Deferred to Phase 4.
