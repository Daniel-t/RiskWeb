---
id: SPEC-SHARED-TYPES
title: Shared Data Model Specification
status: draft
assigned: analyst
task: TASK-005
created: 2026-05-15
---

# Shared Data Model Specification

This document defines the core TypeScript interfaces shared between frontend and backend. These are specification-only — implementation lives in `shared/` (see TASK-006).

---

## 1. Scenario (top-level container)

```typescript
interface Scenario {
  id: string;                        // UUID v4
  name: string;                      // User-assigned scenario name
  description?: string;              // Optional free-text description
  nodes: AttackTreeNode[];           // All nodes in the attack tree
  edges: Edge[];                     // All edges connecting nodes
  simulationConfig: SimulationConfig;
  results?: SimulationResult;        // Populated after simulation runs
  metadata: {
    created: string;                 // ISO 8601 datetime
    modified: string;                // ISO 8601 datetime
  };
}
```

**Notes:**
- `id` is generated server-side on first save (UUID v4).
- `results` is optional — absent until a simulation has been run.
- `metadata.modified` is updated on every save.

---

## 2. AttackTreeNode

```typescript
interface AttackTreeNode {
  id: string;                        // UUID v4, unique within scenario
  type: "leaf" | "and" | "or";       // Node type
  label: string;                     // Display label
  position: { x: number; y: number }; // Canvas coordinates (React Flow)
  fairInputs?: FAIRInputs;          // Only present on leaf nodes
}
```

**Notes:**
- `fairInputs` is only meaningful on `"leaf"` nodes. Gates (`"and"`, `"or"`) derive their values from children during simulation.
- `position` stores React Flow canvas coordinates for persistence across save/load.
- The `type` field is intentionally a string union (not enum) for JSON serialization simplicity.

---

## 3. Edge

```typescript
interface Edge {
  id: string;                        // UUID v4
  sourceId: string;                  // Parent node ID
  targetId: string;                  // Child node ID
}
```

**Notes:**
- Edges flow from parent (source) to child (target), representing attack tree decomposition.
- The tree must be validated at the application layer: no cycles, single root (a node with no incoming edges).

---

## 4. FAIRInputs

```typescript
interface FAIRInputs {
  lef: Distribution;                 // Loss Event Frequency
  lm: Distribution;                  // Loss Magnitude (dollars)
}
```

**Notes:**
- LEF represents annualized frequency of loss events (e.g., 0.1 = once per 10 years).
- LM represents dollar loss per event.
- ALE (Annualized Loss Expectancy) = LEF * LM, computed during simulation.

### Extensibility

In future phases, FAIRInputs will expand to the full FAIR taxonomy:

```
LEF = TEF * Vulnerability
TEF = Contact Frequency * Probability of Action
LM  = Primary Loss + Secondary Loss
```

The current simplified model (LEF + LM only) is sufficient for MVP. The interface can be extended with optional fields without breaking existing scenarios.

---

## 5. Distribution (discriminated union)

```typescript
type Distribution =
  | { type: "pert"; params: PERTParams }
  | { type: "lognormal"; params: LognormalParams }
  | { type: "constant"; params: ConstantParams };
```

**Notes:**
- Uses a discriminated union on the `type` field for type-safe parameter access.
- New distribution types (e.g., `"triangular"`, `"uniform"`) can be added by extending this union.

---

## 6. Distribution Parameter Types

### PERTParams

```typescript
interface PERTParams {
  min: number;   // Minimum value (optimistic estimate)
  mode: number;  // Most likely value
  max: number;   // Maximum value (pessimistic estimate)
}
```

**Validation constraints:** `min >= 0`, `min <= mode <= max`, `max > min`.

PERT sampling uses the beta distribution transform: shape parameters derived from min/mode/max with lambda=4.

### LognormalParams

```typescript
interface LognormalParams {
  mu: number;    // Mean of the underlying normal distribution (log-space)
  sigma: number; // Standard deviation of the underlying normal distribution
}
```

**Validation constraints:** `sigma > 0`.

### ConstantParams

```typescript
interface ConstantParams {
  value: number; // Fixed value returned on every sample
}
```

**Validation constraints:** `value >= 0`.

---

## 7. SimulationConfig

```typescript
interface SimulationConfig {
  iterations: number;                // Default: 10000
  seed?: number;                     // Optional seed for reproducible results
  confidenceIntervals: number[];     // Default: [0.10, 0.50, 0.90]
}
```

**Notes:**
- `iterations` controls Monte Carlo sample count. Higher values = more precision, longer runtime.
- `seed` enables deterministic results for testing and reproducibility.
- `confidenceIntervals` defines which percentiles to compute (values between 0 and 1).

---

## 8. SimulationResult

```typescript
interface SimulationResult {
  summary: {
    mean: number;                    // Mean ALE across all iterations
    stddev: number;                  // Standard deviation of ALE
    percentiles: Record<number, number>; // e.g., { 0.1: 50000, 0.5: 120000, 0.9: 500000 }
  };
  perNode: Record<string, {         // Keyed by node ID
    meanALE: number;
    percentiles: Record<number, number>;
  }>;
  iterations: number;               // Actual iterations run
  duration: number;                  // Execution time in milliseconds
}
```

**Notes:**
- `percentiles` keys correspond to the values in `SimulationConfig.confidenceIntervals`.
- `perNode` includes results for every node (leaves and gates) so users can see risk contribution at each level.
- `duration` is wall-clock time for the simulation run.

### Extensibility

Future phases will add:
- `samples?: number[]` — raw ALE values per iteration (for custom visualizations, currently omitted for memory efficiency)
- Bayesian posterior metadata (prior/posterior distribution parameters after evidence updating)

---

## 9. ScenarioMeta (list endpoints)

```typescript
interface ScenarioMeta {
  id: string;                        // Scenario UUID
  name: string;                      // Scenario name
  modified: string;                  // ISO 8601 datetime
}
```

**Notes:**
- Lightweight projection of `Scenario` for list/search endpoints (`GET /api/scenarios`).
- Avoids transferring full tree data when only metadata is needed.

---

## MVP Data Flow

These types support the following end-to-end flow:

1. **Build tree** — User creates `AttackTreeNode[]` and `Edge[]` on the canvas
2. **Enter FAIR inputs** — User sets `FAIRInputs` (LEF + LM distributions) on leaf nodes
3. **Configure simulation** — `SimulationConfig` with iteration count and percentiles
4. **Run simulation** — Engine receives `Scenario`, samples distributions, propagates through gates, produces `SimulationResult`
5. **View results** — Frontend renders `SimulationResult.summary` (stats table) and histogram
6. **Save/Load** — Full `Scenario` (including results) serialized to JSON via backend API; `ScenarioMeta` used for listing

---

## JSON Serialization

All interfaces serialize directly to/from JSON without transformation:
- No `Date` objects — use ISO 8601 strings
- No `Map` types — use `Record<K, V>`
- No class instances — plain objects only
- UUIDs are plain strings (no wrapper type)

This ensures compatibility with `JSON.stringify`/`JSON.parse` and REST API transport.
