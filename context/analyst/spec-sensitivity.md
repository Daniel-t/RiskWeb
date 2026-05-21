---
id: SPEC-SENSITIVITY
title: Sensitivity Analysis Specification
status: draft
assigned: analyst
epic: E3.3
depends_on: [SPEC-FAIR-SIMPLIFIED, SPEC-FAIR-TAXONOMY]
created: 2026-05-21
modifies: context/analyst/spec-sensitivity.md
---

# Sensitivity Analysis Specification

This document specifies two sensitivity analysis modes for RiskWeb: **control-toggle analysis** (which controls matter most?) and **input parameter OAT sweep** (which assumptions drive the most uncertainty?). Both produce tornado chart visualizations.

Implementors: @frontend (engine extension, tornado chart component, results panel integration).

---

## 1. Motivation

A security architect needs to answer two questions after running a simulation:

1. **Control investment:** "Which of my controls contributes the most risk reduction? Where should I invest next?"
2. **Data quality:** "Which input assumptions drive the most variance in my ALE estimate? Where should I invest in better data?"

The control-toggle tornado directly supports control investment decisions. The input parameter sweep identifies where better estimates (e.g., from pen testing or threat intel) would most improve analytical confidence.

---

## 2. Control-Toggle Sensitivity Analysis (Primary View)

### 2.1 Method

For a scenario with N active controls:

1. Run the **baseline simulation** with all controls enabled (already computed as part of normal simulation).
2. For each active control `c_i` (i = 1..N):
   a. Create a modified scenario where **only** `c_i` is disabled (all other controls remain enabled).
   b. Run a full simulation with the **same seed** as the baseline.
   c. Record `ALE_mean(c_i_off)`.
3. Compute delta for each control: `delta_i = ALE_mean(c_i_off) - ALE_mean(all_controls_on)`.
4. Sort controls by `|delta_i|` descending.

### 2.2 Interpretation

- A large positive delta means disabling that control significantly increases ALE -- it's a high-value control.
- Controls with near-zero delta are candidates for cost review (they're not contributing much).
- The tornado chart visually ranks controls by their marginal contribution to risk reduction.

### 2.3 Seed Consistency

All simulation runs (baseline + N control-toggle runs) MUST use the same seed. This ensures that differences in ALE are attributable solely to the toggled control, not to random sampling variation. The seed from `SimulationConfig.seed` is used; if no seed is set, one is generated and reused across all runs.

### 2.4 Performance

Each control-toggle run is a full Monte Carlo simulation. For a scenario with 10 controls and 10,000 iterations, this is 11 simulation runs (1 baseline + 10 toggles). At ~50ms per run, total time is ~550ms -- acceptable for interactive use.

If performance becomes an issue with many controls or high iteration counts, a future optimization could sample fewer iterations for sensitivity runs (e.g., 1,000 instead of 10,000). This is NOT implemented initially.

---

## 3. Input Parameter OAT Sweep (Secondary View)

### 3.1 Method: One-At-a-Time (OAT)

For each input distribution in the scenario (leaf LEF, leaf TEF, leaf Vulnerability, scenario LM):

1. Compute the **expected value** of the distribution:
   - PERT: `E[X] = (min + lambda * mode + max) / (lambda + 2)` where `lambda = 4`, so `E[X] = (min + 4*mode + max) / 6`
   - Lognormal: `E[X] = exp(mu + sigma^2 / 2)`
   - Constant: `value`

2. Compute the distribution's **P10** and **P90** values. For efficiency, approximate these analytically rather than via sampling:
   - PERT: Use the beta distribution quantile function with the PERT alpha/beta parameters, then scale to [min, max].
   - Lognormal: `P10 = exp(mu + sigma * z_0.10)`, `P90 = exp(mu + sigma * z_0.90)` where `z_0.10 = -1.2816`, `z_0.90 = 1.2816`.
   - Constant: P10 = P90 = value (no sensitivity -- skip this input).

3. **Hold all other inputs at their expected values** (replace distributions with constants).

4. Run simulation with target input set to **constant(P10)** -> record `ALE_low`.

5. Run simulation with target input set to **constant(P90)** -> record `ALE_high`.

6. Swing: `swing_i = ALE_high - ALE_low`.

7. Sort inputs by `|swing_i|` descending. Display top N (default N=10).

### 3.2 Interpretation

- Large swing = this input drives the most uncertainty in ALE.
- A security architect should prioritize gathering better evidence for high-swing inputs.
- Inputs with near-zero swing can use rough estimates without affecting analysis quality.

### 3.3 Constant Inputs

If an input is a constant distribution (zero variance), it contributes zero swing. These are excluded from the tornado chart automatically.

### 3.4 Control Reduction Distributions

The OAT sweep also covers control effectiveness distributions. For each active control's `lefReduction` and `lmReduction` (or their overrides):

- Compute P10 and P90 of the reduction distribution.
- Sweep as above, holding all other inputs at expected values.
- This reveals which control effectiveness estimates have the most impact.

### 3.5 Performance

Each input requires 2 simulation runs (P10 and P90). For a scenario with 5 leaves + 1 LM + 8 control distributions = 14 inputs, that's 28 runs. With reduced iterations (e.g., 1,000 for OAT vs. 10,000 for primary), total time is ~1.4s.

**Optimization:** OAT runs use a fixed 1,000 iterations regardless of the scenario's configured iteration count. This is sufficient for mean ALE estimation (which converges quickly) and keeps the sweep fast.

---

## 4. Data Model

### 4.1 Sensitivity Request

```typescript
interface SensitivityRequest {
  type: 'control-toggle' | 'oat-sweep';
  scenario: Scenario;
  controls: Control[];
  seed: number;              // Enforced same seed for all runs
  oatIterations?: number;    // Default 1000 for OAT sweep
}
```

### 4.2 Sensitivity Result

```typescript
interface SensitivityResult {
  type: 'control-toggle' | 'oat-sweep';
  baselineALE: number;       // Mean ALE with all controls on (control-toggle) or all at expected (OAT)
  items: SensitivityItem[];  // Sorted by |delta| descending
  duration: number;          // Total computation time in ms
}

interface SensitivityItem {
  // Identification
  id: string;                // controlId (for control-toggle) or "{nodeId}.{field}" (for OAT)
  label: string;             // Human-readable name (control name, or "Node: Phishing > LEF")
  category: 'control' | 'lef' | 'tef' | 'vulnerability' | 'lm' | 'lefReduction' | 'lmReduction';

  // Values
  aleLow: number;            // ALE when input is at low end (P10) or control enabled
  aleHigh: number;           // ALE when input is at high end (P90) or control disabled
  delta: number;             // aleHigh - aleLow (always positive for control-toggle)

  // For OAT only: the input values tested
  inputLow?: number;         // P10 of the input distribution
  inputHigh?: number;        // P90 of the input distribution
  inputExpected?: number;    // Expected value of the input distribution
}
```

### 4.3 Store Extension

Add to `simulationStore` (or a new `sensitivityStore`):

```typescript
interface SimulationState {
  // ... existing fields ...
  sensitivityResult?: SensitivityResult;
  sensitivityRunning: boolean;
}
```

### 4.4 Shared Types

Add to `shared/src/index.ts`:

```typescript
export interface SensitivityResult {
  type: 'control-toggle' | 'oat-sweep';
  baselineALE: number;
  items: SensitivityItem[];
  duration: number;
}

export interface SensitivityItem {
  id: string;
  label: string;
  category: 'control' | 'lef' | 'tef' | 'vulnerability' | 'lm' | 'lefReduction' | 'lmReduction';
  aleLow: number;
  aleHigh: number;
  delta: number;
  inputLow?: number;
  inputHigh?: number;
  inputExpected?: number;
}
```

These are NOT stored on the `Scenario` object (they're ephemeral analysis results, not scenario state). They live only in the Zustand store.

---

## 5. Worker Protocol

### 5.1 Message Types

```typescript
// Request
{ type: 'sensitivity'; request: SensitivityRequest }

// Progress (optional, for long-running sweeps)
{ type: 'sensitivity-progress'; completed: number; total: number }

// Result
{ type: 'sensitivity-result'; result: SensitivityResult }
```

### 5.2 Execution

The sensitivity analysis runs in the **same Web Worker** as the primary simulation. It reuses `evaluateTree()`, `applyLmReductions()`, and all existing engine functions. The worker:

1. Receives the sensitivity request.
2. For control-toggle: iterates over controls, disabling one at a time, running full simulation each time.
3. For OAT: iterates over input distributions, replacing one with P10/P90 constants, running simulation each time.
4. Emits progress updates after each sub-run completes.
5. Returns the sorted `SensitivityResult`.

---

## 6. Tornado Chart Visualization

### 6.1 Layout

- Horizontal bar chart.
- Center axis at baseline ALE (mean).
- Bars extend left (ALE decreases) and right (ALE increases) from baseline.
- Each bar labeled with the input/control name on the Y-axis.
- Sorted top-to-bottom by `|delta|` (most influential at top).

### 6.2 Control-Toggle Chart

- Each bar represents one control.
- Left end of bar: ALE with all controls on (baseline).
- Right end of bar: ALE with this control disabled.
- All bars extend rightward (disabling a control always increases ALE).
- Color: use control category colors (preventive/detective/corrective) for consistency with control badges.

### 6.3 OAT Sweep Chart

- Each bar represents one input distribution.
- Left end: ALE when input is at P10.
- Right end: ALE when input is at P90.
- Bars may extend in both directions from the baseline (some inputs increase ALE when high, some decrease).
- Color-code by category: blue for LEF/TEF/Vuln inputs, green for LM, orange for control reductions.

### 6.4 Interaction

- Hover: tooltip showing input name, P10/P90 input values, corresponding ALE values, and delta.
- Click (optional, future): navigate to the relevant node or control in the editor.
- Top N filter: default show top 10. User can adjust via dropdown.

### 6.5 Tab UI

The results panel adds a "Sensitivity" tab (alongside existing "Summary" and "Histogram" views). Within the Sensitivity tab, a toggle switches between "Control Impact" and "Input Sensitivity" views.

---

## 7. Worked Example

### 7.1 Control-Toggle Example

**Scenario:** OR gate with 2 leaves, 3 controls applied.

| Control | Applied To | lefReduction |
|---------|-----------|-------------|
| WAF | Leaf A (SQL Injection) | constant(0.85) |
| MFA | Leaf B (Credential Theft) | constant(0.70) |
| SIEM | Leaf A (SQL Injection) | constant(0.30) |

**Simulation results (10,000 iterations, same seed):**

| Configuration | Mean ALE |
|--------------|----------|
| All controls on | $42,000 |
| WAF off | $185,000 |
| MFA off | $98,000 |
| SIEM off | $54,000 |

**Tornado (sorted by delta):**

| Control | Delta | Rank |
|---------|-------|------|
| WAF | +$143,000 | 1 |
| MFA | +$56,000 | 2 |
| SIEM | +$12,000 | 3 |

**Insight:** WAF is the most critical control. Losing it nearly quadruples ALE. SIEM provides marginal benefit in this scenario.

### 7.2 OAT Sweep Example

**Same scenario, holding all inputs at expected values except the one being swept:**

| Input | P10 | Expected | P90 | ALE at P10 | ALE at P90 | Swing |
|-------|-----|----------|-----|------------|------------|-------|
| Scenario LM | $80K | $200K | $450K | $16,800 | $94,500 | $77,700 |
| Leaf A LEF | 0.5 | 2.0 | 4.5 | $28,000 | $61,000 | $33,000 |
| Leaf B LEF | 0.2 | 1.0 | 2.5 | $35,000 | $55,000 | $20,000 |

**Insight:** Loss magnitude uncertainty dominates. Investing in better LM estimation (e.g., tabletop exercise to quantify breach cost) would improve the analysis more than refining LEF estimates.

---

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| No controls assigned | Control-toggle tab shows empty state: "No controls to analyze." OAT sweep still works. |
| All controls disabled | Same as no controls. Skip control-toggle analysis. |
| Single control | Control-toggle shows one bar. Still useful for what-if. |
| Constant distribution input | OAT swing = 0. Excluded from tornado chart. |
| All inputs constant | OAT sweep shows empty state: "All inputs are constant -- no sensitivity to analyze." |
| Very large tree (50+ nodes) | OAT sweep may be slow with many inputs. Show progress bar. Consider capping at top 20 inputs. |

---

## 9. Out of Scope

- **Multi-way sensitivity** (varying 2+ inputs simultaneously): Deferred. OAT is sufficient for Phase 3.
- **Monte Carlo sensitivity** (correlation-based, e.g., Spearman rank): Deferred. Requires full sample storage per input.
- **Cost-benefit analysis** (control cost vs. ALE reduction): Deferred. Would require a `cost` field on controls.
- **Automated recommendations** ("you should invest in X"): Deferred. The tornado chart is the decision support tool; interpretation is left to the analyst.
