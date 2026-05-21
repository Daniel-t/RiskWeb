---
id: SPEC-FAIR-TAXONOMY
title: FAIR Taxonomy Expansion Specification
status: draft
assigned: analyst
epic: E3.1
depends_on: [SPEC-FAIR-SIMPLIFIED]
created: 2026-05-21
modifies: context/analyst/spec-fair-taxonomy.md
---

# FAIR Taxonomy Expansion Specification

This document specifies the optional decomposition of Loss Event Frequency (LEF) into Threat Event Frequency (TEF) and Vulnerability at leaf nodes. The expansion is **backward compatible** -- existing scenarios with direct LEF inputs continue to work unchanged.

Implementors: @frontend (shared types, simulation engine, property panel UI).

---

## 1. Motivation

The simplified model defines LEF as a single distribution per leaf. In practice, security architects benefit from separating two distinct questions:

- **TEF (Threat Event Frequency):** How often does a threat actor attempt this attack? (Events per year)
- **Vulnerability:** Given an attempt, what fraction succeeds? (Probability 0-1)

This maps to different evidence sources: TEF comes from threat intelligence (e.g., DBIR incident rates), while Vulnerability comes from technical assessment (e.g., pen test findings, control maturity). Separating them improves analytical rigor and enables more targeted sensitivity analysis.

---

## 2. Model

### 2.1 Decomposed LEF

When a leaf node has TEF and Vulnerability defined:

```
effective_LEF = TEF * Vulnerability
```

Per iteration, both TEF and Vulnerability are independently sampled from their distributions, then multiplied.

### 2.2 Input Modes

Each leaf node operates in one of two modes:

| Mode | Fields Used | Behavior |
|------|-------------|----------|
| **Direct** (default) | `lef` | LEF sampled directly from `fairInputs.lef`. Current behavior. |
| **Decomposed** | `tef` + `vulnerability` | LEF computed as `TEF * Vulnerability` per iteration. `lef` field is ignored. |

The mode is determined by the presence of the `tef` and `vulnerability` fields. If both are present, the node is in decomposed mode.

### 2.3 Validation Rules

| Rule | Condition | Error |
|------|-----------|-------|
| Both or neither | If `tef` is set, `vulnerability` must also be set, and vice versa | "Node '{label}': TEF and Vulnerability must both be defined or both omitted" |
| TEF params | Same distribution validation rules as LEF (see SPEC-FAIR-SIMPLIFIED section 6) | "Invalid TEF distribution on '{label}'" |
| Vulnerability range | Vulnerability distribution should produce values in [0, 1]. For PERT: `0 <= min <= mode <= max <= 1`. For constant: `0 <= value <= 1`. For lognormal: warning only (clamped at runtime). | "Node '{label}': Vulnerability should be between 0 and 1" |
| Direct mode fallback | If `tef` and `vulnerability` are absent, `lef` must be defined (existing rule) | "Node '{label}' is missing LEF distribution" |

**Runtime clamping:** Sampled Vulnerability values are clamped to [0, 1]. TEF values are not clamped (frequency > 1 is valid, e.g., 5 attempts/year).

---

## 3. Type Changes

### 3.1 FAIRInputs (shared/src/index.ts)

```typescript
export interface FAIRInputs {
  lef: Distribution;              // Used in direct mode
  tef?: Distribution;             // Threat Event Frequency (events/year)
  vulnerability?: Distribution;   // Probability of success per attempt (0-1)
}
```

The `lef` field remains **required** for backward compatibility. When in decomposed mode, `lef` is not sampled by the engine -- `tef * vulnerability` is used instead. The UI may optionally auto-populate `lef` with an expected-value estimate for display purposes.

### 3.2 No Changes to Other Types

- `Scenario`, `SimulationResult`, `SimulationConfig`, `Control`, `ControlAssignment` -- unchanged.
- Scenario-level `lossMagnitude` stays as-is. No per-node LM this phase.

---

## 4. Engine Changes

### 4.1 evaluateTree() Modification

In `fairEngine.ts`, the leaf evaluation step changes from:

```
// Current:
lef = sample(node.fairInputs.lef, rng)
```

To:

```
// Updated:
if node.fairInputs.tef AND node.fairInputs.vulnerability:
  tef = sample(node.fairInputs.tef, rng)
  vuln = sample(node.fairInputs.vulnerability, rng)
  vuln = clamp(vuln, 0, 1)
  lef = tef * vuln
else:
  lef = sample(node.fairInputs.lef, rng)
```

This is the **only engine change**. Gate aggregation, control reductions, LM sampling, and ALE computation remain identical.

### 4.2 Control Interaction

Controls that reduce LEF still apply to the **effective LEF** (after TEF * Vulnerability multiplication). The control reduction pipeline is unchanged:

```
base_lef = tef * vulnerability   (or direct lef)
effective_lef = base_lef * combined_control_passthrough
```

This is semantically correct: a control like an email filter reduces the effective frequency of successful attacks, regardless of whether that frequency came from a direct estimate or a TEF * Vulnerability decomposition.

### 4.3 Per-Node Statistics Extension

Currently `perNode` in `SimulationResult` stores `meanLEF` and LEF percentiles. When a node is in decomposed mode, also store:

```typescript
perNode: Record<string, {
  meanLEF: number;
  percentiles: Record<number, number>;
  meanTEF?: number;              // NEW: only present for decomposed nodes
  meanVulnerability?: number;    // NEW: only present for decomposed nodes
}>
```

This enables the results view to show "average 4.2 attempts/year, 28% success rate = 1.18 events/year" per node.

---

## 5. Migration

### 5.1 Existing Scenarios

No migration needed. Existing scenarios have `fairInputs: { lef: ... }` on leaves with no `tef` or `vulnerability` fields. The engine's `if tef AND vulnerability` check falls through to the existing `lef` path.

### 5.2 Export/Import

The JSON export/import (`fileIO.ts`) requires no changes. Optional fields (`tef`, `vulnerability`) are naturally included when present and absent when not. The `validate.ts` schema validation should accept both forms.

### 5.3 IndexedDB

No schema migration needed. IndexedDB stores full scenario objects; the additional optional fields are transparent to the storage layer.

---

## 6. UI Behavior (Guidance for @ux / @frontend)

### 6.1 Property Panel

When a leaf node is selected, the FAIR inputs section shows:

- **Default (direct mode):** Single LEF distribution editor (current behavior).
- **Toggle button:** "Decompose into TEF x Vulnerability" expands to show TEF and Vulnerability distribution editors, hiding the direct LEF editor.
- **Toggle back:** "Use direct LEF" collapses back to single LEF editor. The `tef` and `vulnerability` fields are removed from `fairInputs`; `lef` is restored (or kept as-is if it was already populated).

### 6.2 Node Display

Nodes in decomposed mode should show a subtle visual indicator (e.g., a small "TEF x V" label below the node name on the canvas) so the user can see at a glance which nodes use decomposed inputs.

---

## 7. Worked Example

**Setup:** Single leaf node "Phishing Attack" with decomposed inputs.

| Field | Distribution |
|-------|-------------|
| TEF | PERT(2, 5, 12) — 2-12 attempts per year, most likely 5 |
| Vulnerability | PERT(0.10, 0.25, 0.50) — 10-50% success rate, most likely 25% |

**Scenario LM:** PERT(50000, 150000, 500000)

**One iteration (sampled values):**

1. Sample TEF: 6.3 attempts/year
2. Sample Vulnerability: 0.31 (31% success)
3. Effective LEF: 6.3 * 0.31 = 1.953 events/year
4. Sample LM: $180,000
5. ALE: 1.953 * $180,000 = $351,540

**With a control (Email Filter, lefReduction = 0.80):**

6. Control passthrough: 1 - 0.80 = 0.20
7. Effective LEF after control: 1.953 * 0.20 = 0.391 events/year
8. ALE: 0.391 * $180,000 = $70,308

**Comparison to direct LEF:** If the user had instead entered LEF = PERT(0.2, 1.25, 6.0) as a direct estimate of the same scenario, simulation results would be similar but the decomposition reveals that the high attempt rate (TEF) is partially offset by moderate vulnerability. Sensitivity analysis can then show whether reducing TEF (threat deterrence) or reducing Vulnerability (hardening) has more impact.

---

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| TEF = 0 | LEF = 0 regardless of Vulnerability. Valid (threat doesn't attempt). |
| Vulnerability = 0 | LEF = 0 regardless of TEF. Valid (attack always fails). |
| Vulnerability sampled > 1 (lognormal) | Clamp to 1.0. Log warning in controlWarnings. |
| TEF very high (e.g., 1000) | Valid. High-frequency threat events (e.g., automated scanning). |
| Mixed modes in same tree | Valid. Some leaves can be direct, others decomposed. Engine handles per-node. |

---

## 9. Out of Scope

- **Contact Frequency / Probability of Action decomposition of TEF**: Deferred. TEF stays as a single factor.
- **Per-node Loss Magnitude**: Deferred. LM remains scenario-level.
- **Primary/Secondary Loss decomposition**: Deferred.
- **Bayesian updates**: Deferred to a future phase.
