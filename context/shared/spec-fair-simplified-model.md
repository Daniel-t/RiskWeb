---
id: SPEC-FAIR-SIMPLIFIED
title: FAIR Simplified Model Calculation Spec
status: approved
assigned: analyst
task: TASK-101
depends_on: [TASK-005]
created: 2026-05-15
revised: 2026-05-16
revision_notes: "Revised to frequency-only tree model. LM defined at scenario level (root), not per-leaf."
---

# FAIR Simplified Model Calculation Spec

This document specifies the simplified FAIR (Factor Analysis of Information Risk) calculation model used in the MVP. The attack tree is a **frequency aggregation structure**: leaf nodes contribute Loss Event Frequency (LEF) distributions, gates aggregate frequencies upward, and Loss Magnitude (LM) is defined once at the scenario level. ALE is computed at the root.

Implementors: @backend (TASK-006 shared types), @frontend (TASK-107 simulation worker).

---

## 1. Simplified FAIR Model

The MVP uses a two-factor model:

```
ALE = aggregated_LEF * scenario_LM
```

| Factor | Meaning | Unit | Where Defined |
|--------|---------|------|---------------|
| LEF | Loss Event Frequency | Events per year (e.g., 0.1 = once per 10 years) | Leaf nodes (sampled from distributions) |
| LM | Loss Magnitude | Dollars per event | Scenario level (single distribution) |
| ALE | Annualized Loss Expectancy | Dollars per year | Computed at root |

**Key design decision:** Leaf nodes contribute frequency only. They represent attack paths and their likelihood, not individual loss amounts. Loss magnitude is a scenario-level parameter representing the cost when the root event (e.g., "Data Breach") materializes, regardless of which attack path caused it.

The scenario's LM distribution is stored on the `Scenario` object (not on any individual node) and is edited in the Scenario Info panel of the UI.

---

## 2. Distribution Sampling

Each simulation iteration samples one value from each distribution. The distribution types and their sampling methods are:

### 2.1 PERT Distribution

PERT uses a beta distribution transform. Given params `{ min, mode, max }`:

```
alpha = 1 + lambda * (mode - min) / (max - min)
beta  = 1 + lambda * (max - mode) / (max - min)
```

Where `lambda = 4` (standard PERT shape parameter).

**Sampling:**
1. Draw `x ~ Beta(alpha, beta)` using the standard beta distribution
2. Scale to range: `value = min + x * (max - min)`

**Beta distribution sampling** (from two gamma variates):
1. Draw `g1 ~ Gamma(alpha, 1)` and `g2 ~ Gamma(beta, 1)`
2. `x = g1 / (g1 + g2)`

**Edge case:** If `min == max`, return `min` (degenerate case).

### 2.2 Lognormal Distribution

Given params `{ mu, sigma }`:

1. Draw `z ~ Normal(0, 1)` (standard normal, e.g., via Box-Muller transform)
2. `value = exp(mu + sigma * z)`

This produces values on `(0, +inf)` with a right-skewed distribution, appropriate for loss magnitude modeling.

### 2.3 Constant Distribution

Given params `{ value }`:

Return `value` on every sample. Useful for known fixed costs or deterministic frequencies.

---

## 3. Gate Aggregation (Frequency Only)

Gate nodes combine their children's sampled **LEF** values within each iteration. The tree is evaluated bottom-up: leaves are sampled first, then gates aggregate from children up to the root. **Gates do not handle LM** — loss magnitude is separate from the tree.

### 3.1 AND Gate

An AND gate represents a scenario where **all** child events must occur for the parent event to materialize.

**LEF aggregation (per iteration):**
```
combined_LEF = product(child_LEF_i)  for all children i
```

Rationale: If two independent events each occur with frequency `f1` and `f2`, the joint frequency is `f1 * f2`.

### 3.2 OR Gate

An OR gate represents a scenario where **any** child event can trigger the parent event.

**LEF aggregation (per iteration):**
```
combined_LEF = 1 - product(1 - child_LEF_i)  for all children i
```

Rationale: Inclusion-exclusion for independent events. The probability that at least one event occurs is 1 minus the probability that none occur.

**Note on LEF values > 1:** LEF represents annualized frequency, so values > 1 are valid (e.g., 3.0 = three times per year). The OR-gate formula above treats LEF as a probability (0-1 range). For MVP:
- If any `child_LEF_i > 1`, clamp to 1.0 before applying the OR formula, then scale the result by `max(child_LEF_i)` to preserve magnitude.
- Alternative: use simple summation `combined_LEF = sum(child_LEF_i)` when any child LEF > 1. This is a conservative (upper-bound) estimate.

The implementation should use the **clamped OR formula** as the default, with a comment noting this is a simplification for MVP.

### 3.3 Tree Traversal Order

1. **Topological sort** the tree nodes from leaves to root (reverse depth-first post-order).
2. For each node in order:
   - If **leaf**: sample LEF from its `fairInputs.lef` distribution.
   - If **gate**: compute combined LEF from already-computed children.
3. The **root node** holds the final aggregated LEF for the scenario.

---

## 4. ALE Computation

For each iteration `k`:

1. Compute `root_LEF_k` by propagating leaf LEF samples through the gate tree (Section 3).
2. Sample `LM_k` from the scenario-level LM distribution.
3. Compute: `ALE_k = root_LEF_k * LM_k`

The simulation produces an array of `N` ALE values (one per iteration), which are then summarized into statistics (see SimulationResult in spec-shared-types.md).

### Per-Node LEF Statistics

For reporting purposes, store per-node LEF samples across iterations. This enables per-node frequency contribution analysis (e.g., "which attack path contributes most to overall frequency?"). Per-node ALE is not computed since LM is scenario-level.

---

## 5. Summary Statistics

After all iterations complete, compute from the ALE array:

| Statistic | Formula |
|-----------|---------|
| Mean | `sum(ALE_k) / N` |
| Std Dev | `sqrt(sum((ALE_k - mean)^2) / (N - 1))` (sample std dev) |
| Percentile P | Sort ALE array ascending; `index = floor(P * N)`; value at that index |

Percentiles are computed for each value in `SimulationConfig.confidenceIntervals` (default: [0.10, 0.50, 0.90]).

Per-node statistics are computed for **LEF only** (mean, std dev, percentiles), enabling frequency contribution analysis in the results view.

---

## 6. Validation Rules

Before simulation can run, validate the scenario:

| Rule | Condition | Error |
|------|-----------|-------|
| Tree has nodes | `nodes.length > 0` | "Scenario has no nodes" |
| Single root | Exactly one node with no incoming edges | "Tree must have exactly one root node" |
| No cycles | DAG validation via DFS | "Tree contains a cycle" |
| All leaves have LEF | Every leaf node has `fairInputs.lef` defined | "Node '{label}' is missing LEF distribution" |
| Scenario has LM | `scenario.lossMagnitude` is defined | "Scenario is missing Loss Magnitude distribution" |
| PERT params valid | `min >= 0 && min <= mode && mode <= max && max > min` | "Invalid PERT parameters on '{label}'" |
| Lognormal params valid | `sigma > 0` | "Invalid lognormal parameters on '{label}'" |
| Constant params valid | `value >= 0` | "Invalid constant value on '{label}'" |
| Iterations valid | `iterations > 0 && iterations <= 1000000` | "Iterations must be between 1 and 1,000,000" |

Note: LM validation (PERT/Lognormal/Constant params) applies to `scenario.lossMagnitude` using the same rules as leaf LEF distributions.

Return all validation errors (not just the first), so the user can fix them in one pass.

---

## 7. Worked Example

**Scenario:** 1 OR-gate root with 2 leaf children. Scenario-level LM = constant($200,000).

| Node | Type | LEF Distribution |
|------|------|-------------------|
| Root | OR | (derived from children) |
| Leaf A | leaf | constant(0.3) |
| Leaf B | leaf | constant(0.1) |

**Scenario LM:** constant(200,000)

**Single iteration (constant distributions):**

1. Sample Leaf A LEF: 0.3
2. Sample Leaf B LEF: 0.1
3. OR-gate LEF: `1 - (1-0.3)(1-0.1) = 1 - 0.63 = 0.37`
4. Sample scenario LM: 200,000
5. Root ALE: `0.37 * 200,000 = $74,000`

With constant distributions, every iteration yields ALE = $74,000. Mean=$74,000, StdDev=0.

**Per-node LEF analysis:** Leaf A (0.3) contributes ~75% of the combined frequency, Leaf B (0.1) contributes ~25%. This helps identify the most likely attack paths without needing per-leaf loss values.

---

## 8. Bayesian Update Stub (Future)

Not implemented in MVP, but the data model accommodates future extension:

```typescript
interface BayesianUpdate {
  priorDistribution: Distribution;      // Original expert estimate
  evidence: EvidenceRecord[];            // Observed data points
  posteriorDistribution: Distribution;   // Updated distribution
  updatedAt: string;                     // ISO 8601
}

interface EvidenceRecord {
  observedValue: number;
  observedAt: string;                    // ISO 8601
  source?: string;                      // Where the observation came from
}
```

This interface is documented here for awareness. It will be specified fully in Phase 3 (TASK E3.2). No implementation should reference these types in MVP.

---

## 9. Implementation Notes for @frontend / @backend

- **Sampling must happen per-iteration**: do not pre-sample arrays. Each iteration independently samples all leaf LEFs and the scenario LM, then propagates.
- **Use a seeded PRNG** when `SimulationConfig.seed` is provided. Recommended: xoshiro128** or similar fast, seedable generator. Do not use `Math.random()` when determinism is required.
- **Floating point**: use standard IEEE 754 double precision. No special handling needed for MVP scale.
- **Performance**: the tree traversal per iteration is O(nodes). With 10,000 iterations and 20 nodes, this is 200,000 node evaluations — well within the 2-second target for a Web Worker.
- **Scenario LM**: the scenario-level `lossMagnitude` distribution is stored on the `Scenario` object and passed to the simulation engine alongside the tree. It is sampled once per iteration, independently of the tree traversal.
