---
id: SPEC-PERFORMANCE
title: Performance Optimization Specification
status: draft
assigned: analyst
epic: E4.4
depends_on: []
created: 2026-05-25
modifies: context/analyst/spec-performance.md
---

# Performance Optimization Specification

This document specifies performance optimization strategies for RiskWeb when handling large attack trees and computationally intensive sensitivity analysis.

Implementors: @frontend. Reviewers: @secarch (worker security).

---

## 1. Motivation

As users build larger attack trees (50+ nodes) and run sensitivity analyses with many controls, the app may experience:
- Sluggish canvas interactions (drag, pan, zoom)
- Long simulation times (especially OAT sweep with many input parameters)
- High memory usage from storing large result sets for multiple comparison scenarios

Phase 4 addresses these proactively before they become user-facing problems.

---

## 2. Canvas Performance for Large Trees

### 2.1 React Flow Built-in Optimizations

React Flow (@xyflow/react) already supports viewport culling -- nodes outside the visible area are not rendered. Verify this is enabled (it is by default).

### 2.2 Custom Node Memoization

**Problem**: Custom node components (`LeafNode`, `GateNode`) may re-render on every canvas interaction if not memoized.

**Requirement**: Wrap all custom node components with `React.memo()` and ensure their props are stable references. Specifically:
- Node data objects should be referentially stable when unchanged
- Control badge data should not cause unnecessary re-renders

**Benchmark target**: Smooth (60fps) pan/zoom with 100 nodes on a mid-range laptop.

### 2.3 Edge Rendering

For trees with 100+ edges, consider using React Flow's `edgesFocusable={false}` and `edgesUpdatable={false}` to reduce event handler overhead on edges.

### 2.4 Property Panel Lazy Rendering

When selecting a node, the property panel loads FAIR inputs and control assignments. For very large trees, ensure the panel only renders data for the selected node, not all nodes.

---

## 3. Worker Pool for Sensitivity Analysis

### 3.1 Problem

OAT sweep runs N+1 simulations (N parameters + baseline). Control-toggle runs N+1 simulations (N controls + baseline). Currently these run sequentially in a single Web Worker.

For a scenario with 10 controls and 15 input parameters, this means 26 sequential simulation runs. At ~1 second each, that's 26 seconds of wall-clock time.

### 3.2 Solution: Parallel Worker Pool

Create a pool of Web Workers that run simulation batches in parallel.

**Design**:
- Pool size: `navigator.hardwareConcurrency - 1` workers (minimum 1, maximum 4)
- Each worker receives one simulation variant (one control toggled, or one parameter at one sweep point)
- A coordinator (in the main thread or a dedicated orchestrator worker) distributes work and collects results
- Reuse existing `simulation.worker.ts` -- each pool worker runs the same code

**Protocol**:
1. Main thread sends `{ type: 'sensitivity', ... }` to orchestrator
2. Orchestrator spawns/reuses N workers
3. Each worker runs one simulation variant and posts result back
4. Orchestrator aggregates results into `SensitivityResult`
5. Orchestrator posts completed `SensitivityResult` to main thread

### 3.3 Constraints

- **Determinism**: Each worker must receive the same seed for reproducibility. The seed for each variant should be derived from the base seed (e.g., `baseSeed + variantIndex`) so results are deterministic but independent.
- **Cancellation**: Cancel message must propagate to all pool workers
- **Memory**: Each worker holds its own copy of scenario data. For very large scenarios, total memory = pool_size x scenario_size. Cap pool size to prevent excessive memory usage.
- **Fallback**: If `navigator.hardwareConcurrency` is unavailable or 1, fall back to single-worker sequential execution (current behavior).

### 3.4 Expected Improvement

With 4 workers and 20 variants: ~5x speedup (20 variants / 4 workers = 5 batches, vs 20 sequential runs). Net: ~5 seconds vs ~20 seconds.

---

## 4. Memory Budget for Comparison Data

### 4.1 Problem

Loading 4 scenarios for comparison means 4 full `Scenario` objects in memory, each potentially with 10K ALE samples.

### 4.2 Guideline

- ALE samples: 10,000 x 8 bytes (Float64) = 80 KB per scenario. 4 scenarios = 320 KB. **Not a concern.**
- Full scenario objects: Nodes + edges + results + controls. Typical: 50-200 KB each. 4 scenarios = 200-800 KB. **Not a concern.**
- **Conclusion**: No lazy loading needed for comparison data at current scale. Revisit if scenarios grow to 500+ nodes or samples exceed 100K.

---

## 5. Lazy Loading of Heavy Modules

### 5.1 PDF Generation

The jsPDF library (~375 KB) should be dynamically imported on first use:
```typescript
const { jsPDF } = await import('jspdf');
```

This keeps the initial bundle small and only loads PDF code when the user clicks "PDF Report".

### 5.2 D3 Chart Components

D3 is already in the initial bundle (needed for results). No further action needed.

---

## 6. Benchmarking Requirements

@frontend should measure before and after for:

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Canvas FPS with 100 nodes | >= 30 fps during pan/zoom | Chrome DevTools Performance panel |
| OAT sweep (10 params, 10K iterations) | < 10 seconds with 4 workers | `performance.now()` in orchestrator |
| Initial page load (Lighthouse) | < 3 seconds on 4G throttle | Lighthouse Performance audit |
| Memory at peak (4-scenario comparison) | < 50 MB heap | Chrome DevTools Memory panel |

---

## 7. Out of Scope

- Server-side computation offloading
- IndexedDB query optimization (not a current bottleneck)
- Tree layout algorithm optimization (dagre is fast enough)
- SharedArrayBuffer / Atomics for worker communication (too complex for current needs)

---

## 8. Acceptance Criteria

1. Custom node components are wrapped in `React.memo()` with stable props
2. Canvas maintains >= 30 fps during pan/zoom with 100 nodes
3. Worker pool spawns up to 4 workers for sensitivity analysis
4. Worker pool correctly aggregates results into `SensitivityResult`
5. Cancellation propagates to all pool workers within 100ms
6. Pool degrades gracefully to single worker when `hardwareConcurrency <= 1`
7. jsPDF is lazy-loaded on first PDF generation, not in the initial bundle
8. No regressions in single-node simulation accuracy or speed
