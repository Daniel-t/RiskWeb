---
id: SPEC-MONTE-CARLO
title: Monte Carlo Simulation Engine Spec
status: approved
assigned: analyst
task: TASK-102
depends_on: [TASK-101]
created: 2026-05-15
---

# Monte Carlo Simulation Engine Spec

This document specifies the architecture and behavior of the Monte Carlo simulation engine for the MVP. The engine runs client-side in a Web Worker.

Implementor: @frontend (TASK-107).

---

## 1. Architecture

```
┌─────────────────────────┐       postMessage        ┌──────────────────────────┐
│    Main Thread (React)  │  ──────────────────────>  │   Web Worker             │
│                         │                           │                          │
│  useSimulation hook     │  <──────────────────────  │  simulation.worker.ts    │
│  - run(scenario)        │       postMessage         │  - fairEngine.ts         │
│  - cancel()             │                           │  - distributions.ts      │
│  - progress / results   │                           │                          │
└─────────────────────────┘                           └──────────────────────────┘
```

### Why client-side?
- No server load; scales with user's hardware.
- Instant feedback; no network latency.
- Backend remains a simple persistence layer.

---

## 2. Message Protocol

### 2.1 Main Thread -> Worker

**Start simulation:**
```typescript
interface SimulationRequest {
  type: "start";
  scenario: Scenario;  // Full scenario from spec-shared-types
}
```

**Cancel simulation:**
```typescript
interface SimulationCancel {
  type: "cancel";
}
```

### 2.2 Worker -> Main Thread

**Progress update:**
```typescript
interface SimulationProgress {
  type: "progress";
  percent: number;       // 0-100, integer
  iterationsComplete: number;
}
```

**Completion:**
```typescript
interface SimulationComplete {
  type: "complete";
  result: SimulationResult;  // From spec-shared-types
}
```

**Error:**
```typescript
interface SimulationError {
  type: "error";
  errors: string[];  // Validation or runtime error messages
}
```

---

## 3. Iteration Flow

For each of `N` iterations (from `scenario.simulationConfig.iterations`):

1. **Initialize PRNG** (once, before first iteration): If `seed` is provided, initialize seeded PRNG. Otherwise use `Math.random()`.
2. **Topological sort** the tree nodes (once, before first iteration): Compute evaluation order from leaves to root.
3. **For each iteration `k`:**
   a. For each node in topological order:
      - **Leaf**: Sample `LEF_k` from `fairInputs.lef` distribution.
      - **Gate**: Aggregate children's LEF per gate type (see spec-fair-simplified-model.md, Section 3).
   b. Sample `LM_k` from `scenario.lossMagnitude` distribution (scenario-level, not per-node).
   c. Compute `ALE_k = root_LEF_k * LM_k`.
   d. Store per-node `{ LEF_k }` for per-node frequency statistics.
4. **Post progress** every `progressInterval` iterations (see Section 5).
5. **Check cancellation** every progress interval: if cancelled, stop and post no result.

After all iterations:
6. **Compute summary statistics** (mean, stddev, percentiles) for root ALE and per-node LEF.
7. **Post completion** with `SimulationResult`.

---

## 4. Cancellation

Use a flag-based approach inside the worker:

```typescript
let cancelled = false;

self.onmessage = (e) => {
  if (e.data.type === "cancel") {
    cancelled = true;
  }
  // ...
};

// In iteration loop:
if (cancelled) {
  return; // Exit without posting results
}
```

The `useSimulation` hook on the main thread should:
- Terminate the worker on cancel if the flag approach doesn't respond within 100ms.
- Expose an `isRunning` state that reflects worker activity.

---

## 5. Progress Reporting

Post progress messages at regular intervals to avoid message overhead:

```
progressInterval = max(1, floor(iterations / 100))
```

This yields at most 100 progress messages per simulation. Each message includes:
- `percent`: `floor(iterationsComplete / iterations * 100)`
- `iterationsComplete`: actual count

The UI should render a progress bar from these messages.

---

## 6. Deterministic Seeding

When `SimulationConfig.seed` is provided:

- Use a seedable PRNG (recommended: **xoshiro128****, or **mulberry32** for simplicity).
- Initialize from `seed` before the first iteration.
- All distribution sampling must use this PRNG instead of `Math.random()`.
- Given the same seed, scenario, and iteration count, results must be identical across runs.

When `seed` is not provided:
- Use `Math.random()` (non-deterministic).

### Recommended: mulberry32

Simple, fast, 32-bit seedable PRNG sufficient for MVP:

```typescript
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

This returns values in `[0, 1)`, drop-in replacement for `Math.random()`.

---

## 7. File Structure

```
frontend/src/
  workers/
    simulation.worker.ts   — Web Worker entry point, message handling, iteration loop
    distributions.ts       — Sampling functions: samplePERT, sampleLognormal, sampleConstant
    fairEngine.ts          — Tree traversal, gate LEF aggregation
  hooks/
    useSimulation.ts       — React hook: run, cancel, progress, results, isRunning
```

### 7.1 distributions.ts

Exports:

```typescript
function sampleDistribution(dist: Distribution, rng: () => number): number
```

Dispatches on `dist.type` to the appropriate sampler. All samplers take an `rng` function (either seeded PRNG or `Math.random`).

### 7.2 fairEngine.ts

Exports:

```typescript
function evaluateTree(
  nodes: AttackTreeNode[],
  edges: Edge[],
  sortedOrder: string[],      // Pre-computed topological order (node IDs)
  rng: () => number
): Map<string, { lef: number }>
```

Returns per-node sampled LEF values for a single iteration. LM is sampled separately at scenario level.

```typescript
function topologicalSort(nodes: AttackTreeNode[], edges: Edge[]): string[]
```

Returns node IDs in evaluation order (leaves first, root last). Throws if cycle detected.

### 7.3 simulation.worker.ts

- Listens for `start` and `cancel` messages.
- On `start`: validates scenario, runs iteration loop, posts progress/complete/error.
- Validation uses rules from spec-fair-simplified-model.md Section 6.

### 7.4 useSimulation.ts

React hook API:

```typescript
interface UseSimulationReturn {
  run: (scenario: Scenario) => void;
  cancel: () => void;
  progress: number;              // 0-100
  results: SimulationResult | null;
  isRunning: boolean;
  errors: string[] | null;
}
```

Lifecycle:
1. `run()` creates a new Worker, posts `SimulationRequest`.
2. Listens for `progress`, `complete`, `error` messages.
3. On `complete`, stores result in state and terminates worker.
4. `cancel()` posts `SimulationCancel`, then terminates worker after brief timeout.
5. Worker is created fresh per run (no pooling in MVP).

---

## 8. Performance Target

| Metric | Target |
|--------|--------|
| 10,000 iterations, 20 nodes | < 2 seconds |
| Progress updates | ~100 messages per run |
| Worker startup | < 100ms |

These targets are conservative for modern hardware. No optimization (WASM, worker pools, SIMD) is needed for MVP.

---

## 9. Error Handling

| Error Type | Handling |
|------------|----------|
| Validation failure (missing inputs, invalid tree) | Post `SimulationError` with all validation messages. Do not run iterations. |
| Runtime error (NaN, Infinity from sampling) | Clamp to 0 and continue. Log warning to console. |
| Worker crash | `useSimulation` catches worker `error` event, sets `errors` state, resets `isRunning`. |

---

## 10. Future Extensions (Not MVP)

Documented for awareness, not for implementation:

- **Worker pooling**: Partition iterations across multiple workers for parallelism.
- **Streaming results**: Post partial histograms during simulation for live visualization.
- **WASM engine**: Port distribution sampling to Rust/WASM for 5-10x speedup on large trees.
- **Bayesian updates**: After evidence is added, re-run simulation with posterior distributions.
- **Sensitivity analysis**: Vary one input at a time, re-run simulation, measure output delta.
