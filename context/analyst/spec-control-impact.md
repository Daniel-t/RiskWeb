---
id: TASK-203
title: Control Impact on Simulation Specification
status: approved
priority: high
assigned: analyst
reviewers: []
depends_on: []
modifies: context/analyst/spec-control-impact.md
---

# Control Impact on Simulation Specification

## 1. Overview

This specification defines how security controls modify Monte Carlo simulation outputs in RiskWeb. Controls represent defensive measures (e.g., firewalls, MFA, endpoint detection) that reduce either the frequency of loss events (LEF) or the magnitude of losses (LM).

Controls are assigned to **leaf nodes only**, consistent with the FAIR methodology where controls apply to specific threat events at the point of attack.

## 2. Control Effectiveness Semantics

### 2.1 Reduction Value

Control effectiveness is expressed as a `Distribution` representing the **fraction of risk reduced**:

- `0.0` = no effect (control provides zero reduction)
- `0.5` = reduces by 50%
- `0.8` = reduces by 80%
- `1.0` = complete elimination (theoretical maximum)

This is the user-facing representation. Internally, it is converted to a **pass-through factor**: `passThrough = 1 - sampledReduction`.

### 2.2 Two Reduction Channels

| Channel | Field | Effect | Example |
|---------|-------|--------|---------|
| Frequency reduction | `lefReduction` | Reduces how often loss events occur | Firewall blocks 80% of attacks |
| Magnitude reduction | `lmReduction` | Reduces severity when loss occurs | Encryption limits data exposure |

Most controls affect frequency (`lefReduction`). Magnitude reduction (`lmReduction`) is optional and applies to scenario-level LM.

## 3. Per-Iteration Calculation

### 3.1 LEF Reduction (per leaf node)

For each Monte Carlo iteration, for each leaf node with assigned controls:

```
base_lef = sample(node.fairInputs.lef, rng)

# Compute combined pass-through from all enabled controls on this node
for each enabled control_i assigned to this node:
  reduction_i = sample(control_i.lefReduction, rng)   # or override if specified
  passThrough_i = 1 - clamp(reduction_i, 0, 1)

combined_passThrough = product(passThrough_i for all enabled controls)
combined_passThrough = clamp(combined_passThrough, 0, 1)

effective_lef = base_lef * combined_passThrough
```

### 3.2 LM Reduction (scenario-level)

For controls that have `lmReduction` defined, applied at scenario level:

```
base_lm = sample(scenario.lossMagnitude, rng)

# Gather all enabled controls with lmReduction across all assigned nodes
for each enabled control_i with lmReduction:
  lm_reduction_i = sample(control_i.lmReduction, rng)   # or override
  lm_passThrough_i = 1 - clamp(lm_reduction_i, 0, 1)

combined_lm_passThrough = product(lm_passThrough_i)
combined_lm_passThrough = clamp(combined_lm_passThrough, 0, 1)

effective_lm = base_lm * combined_lm_passThrough
```

### 3.3 ALE Calculation

```
ALE = root_effective_lef * effective_lm
```

Where `root_effective_lef` is the result of aggregating leaf effective_lef values through AND/OR gates as defined in the existing simulation spec.

## 4. Stacking Behavior

### 4.1 Rule: Multiplicative Independence

Multiple controls on the same node stack **multiplicatively**, modeling independent defense layers:

| Controls | Individual Reductions | Combined Pass-Through | Effective Reduction |
|----------|----------------------|----------------------|-------------------|
| A only | 0.80 | 0.20 | 80% |
| A + B | 0.80, 0.70 | 0.20 * 0.30 = 0.06 | 94% |
| A + B + C | 0.80, 0.70, 0.50 | 0.20 * 0.30 * 0.50 = 0.03 | 97% |

### 4.2 Rationale

- Models defense-in-depth: each layer independently reduces residual risk
- Naturally captures diminishing returns (adding a 4th control gives less marginal benefit)
- Standard approach in probabilistic risk assessment

### 4.3 No Double-Counting Protection

If the same control is assigned to the same node twice (via separate ControlAssignment entries), it applies twice. The UI should prevent duplicate assignments, but the engine does not enforce uniqueness.

## 5. Bounds and Clamping

| Value | Lower Bound | Upper Bound | Rationale |
|-------|-------------|-------------|-----------|
| Sampled reduction | 0.0 | 1.0 | A control cannot increase risk or reduce more than 100% |
| Combined pass-through | 0.0 | 1.0 | Effective LEF cannot be negative or exceed base |
| Effective LEF | 0.0 | (no upper) | LEF is non-negative; upper bound from distribution |
| Effective LM | 0.0 | (no upper) | LM is non-negative; upper bound from distribution |

### 5.1 Minimum Residual Risk (Optional Warning)

If `combined_passThrough < 0.01` (i.e., controls claim to eliminate >99% of risk), the simulation should flag a **warning** in results:

```
"controlWarnings": ["Node '{label}' has combined control reduction >99%. Verify control effectiveness assumptions."]
```

This does NOT clamp the value — it alerts the user to review assumptions.

## 6. Disabled Controls

Controls with `enabled: false` in the `ControlAssignment` are **completely skipped** during simulation. They contribute no reduction factor. This allows users to toggle controls on/off for what-if analysis without removing the assignment.

## 7. Missing or Invalid Controls

### 7.1 Orphaned Assignments

If a `ControlAssignment` references a `controlId` that no longer exists in the library:
- **Simulation behavior**: Skip the assignment (treat as if it doesn't exist)
- **UI behavior**: Display warning indicator on the node
- **Persistence**: Keep the assignment in the scenario (don't auto-delete)

### 7.2 Invalid Distributions

If a control's reduction distribution produces values outside [0, 1] (e.g., a poorly configured lognormal):
- Clamp sampled value to [0, 1]
- No error — the clamp handles it gracefully

## 8. Integration Points

### 8.1 Simulation Worker Changes

In `simulation.worker.ts`, the worker must receive:
- The scenario (already has `controlAssignments`)
- The full `Control` objects for all referenced controls (resolved by the UI before sending to worker)

Message protocol extension:
```typescript
// Updated start message:
{ type: "start"; scenario: Scenario; controls: Control[] }
```

### 8.2 fairEngine.ts Changes

The `evaluateTree()` function signature changes:
```typescript
function evaluateTree(
  sortedNodes: AttackTreeNode[],
  edges: Edge[],
  controlAssignments: ControlAssignment[],  // NEW
  controls: Control[],                       // NEW
  rng: () => number
): Record<string, number>
```

### 8.3 Results Extension

Add to `SimulationResult`:
```typescript
interface SimulationResult {
  // ... existing fields ...
  controlWarnings?: string[];  // Warnings about extreme reduction values
}
```

## 9. Example Calculation

**Setup:**
- Leaf "Phishing Attack": LEF = PERT(1, 3, 8) per year
- Control A "Email Filter": lefReduction = PERT(0.70, 0.80, 0.90)
- Control B "Security Training": lefReduction = PERT(0.20, 0.30, 0.40)
- Scenario LM = Lognormal(mu=12, sigma=1)

**One iteration:**
1. Sample LEF: 4.2 events/year
2. Sample Control A reduction: 0.82 → passThrough = 0.18
3. Sample Control B reduction: 0.31 → passThrough = 0.69
4. Combined passThrough: 0.18 * 0.69 = 0.124
5. Effective LEF: 4.2 * 0.124 = 0.52 events/year
6. Sample LM: $180,000
7. ALE: 0.52 * $180,000 = $93,744

**Without controls:** ALE = 4.2 * $180,000 = $756,000
**Risk reduction:** ~88%

## 10. Override Mechanism

Each `ControlAssignment` can optionally override the control's default effectiveness:

```typescript
interface ControlAssignment {
  // ...
  lefReductionOverride?: Distribution;  // If set, use instead of control.lefReduction
  lmReductionOverride?: Distribution;   // If set, use instead of control.lmReduction
}
```

**Resolution order:**
1. Use `lefReductionOverride` if present on the assignment
2. Else use `lefReduction` from the `Control` definition

This allows scenario-specific tuning (e.g., "our WAF is less effective against this particular technique").
