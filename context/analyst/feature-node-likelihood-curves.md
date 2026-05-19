---
id: FEATURE-001
title: Per-Node Likelihood Distribution Curves
status: draft
priority: medium
assigned: analyst
reviewers: [ux, frontend]
depends_on: [TASK-107, TASK-109, TASK-113]
modifies: [shared/src/index.ts, context/shared/spec-shared-types.md]
created: 2026-05-16
---

# FEATURE-001: Per-Node Likelihood Distribution Curves

## Objective

Enable users to visually inspect the Loss Event Frequency (LEF) distribution for every node in the attack tree. Currently the only visualization is the aggregate ALE histogram in the results drawer. Analysts need to see per-node distributions to understand which attack paths drive the most risk, validate their input assumptions against simulation output, and communicate findings to stakeholders.

## Motivation

1. **Input validation** -- Analysts configure PERT or lognormal distributions on leaf nodes but have no visual feedback showing the distribution shape. A curve preview helps catch misconfigured parameters (e.g., a PERT with min close to max producing a near-constant distribution).
2. **Simulation insight** -- After running Monte Carlo, the simulated LEF samples for each node may differ from the theoretical input (especially for gate nodes that aggregate children). Overlaying both curves reveals how the tree structure transforms individual likelihoods.
3. **Communication** -- Sparkline previews on the canvas give an at-a-glance sense of each node's frequency profile without requiring selection.

## Requirements

### R1: Canvas Sparkline (all node types)

Each node on the React Flow canvas displays a small inline distribution curve.

- **Leaf nodes (pre-simulation):** Render the theoretical PDF of the configured LEF distribution (PERT or lognormal). Constant distributions show a single vertical line.
- **Leaf nodes (post-simulation):** Replace with a mini histogram of simulated LEF samples.
- **Gate nodes (pre-simulation):** Show an empty/placeholder state (no input distribution exists).
- **Gate nodes (post-simulation):** Show a mini histogram of the aggregated LEF samples from simulation.
- **Sizing:** The sparkline occupies the lower portion of the node. Node dimensions will need to increase -- defer exact sizing to @ux.
- **No axes, labels, or interactivity** on the sparkline. It is a shape-only preview.
- **Color:** Use a single fill color per node type (defer palette to @ux).

### R2: Property Panel Chart (selected node)

When a node is selected, the right-side property panel shows a full-size interactive distribution chart.

- **Leaf nodes (pre-simulation):** Render the theoretical PDF curve for the configured LEF distribution.
- **Leaf nodes (post-simulation):** Overlay the theoretical PDF curve AND the simulated LEF histogram on the same chart. Use distinct visual treatments (e.g., line for PDF, filled bars for histogram -- defer to @ux).
- **Gate nodes (pre-simulation):** Show an informational message: "Run simulation to see aggregated distribution."
- **Gate nodes (post-simulation):** Show the simulated LEF histogram.
- **Chart features:**
  - X-axis: LEF value (events/year)
  - Y-axis: Probability density (for PDF) / Frequency (for histogram)
  - Percentile markers: P10, P50, P90 as dashed vertical lines (reuse pattern from existing ALE histogram)
  - Hover tooltip showing exact value at cursor position
- **Placement:** Below the existing FAIR input fields (leaf) or gate info (gate), within the same scrollable panel area.

### R3: Data Model Changes

The simulation engine must return per-node raw LEF sample arrays to support histograms.

**Current `SimulationResult.perNode`:**
```typescript
perNode: Record<string, {
  meanLEF: number;
  percentiles: Record<number, number>;
}>
```

**Proposed `SimulationResult.perNode`:**
```typescript
perNode: Record<string, {
  meanLEF: number;
  percentiles: Record<number, number>;
  rawLEF?: number[];  // Raw samples from simulation (optional for backward compat)
}>
```

- `rawLEF` is an array of length `iterations` containing the sampled LEF for this node across all iterations.
- The field is optional (`?`) so that saved scenarios without raw data remain valid.
- The Web Worker must collect and return these arrays alongside existing summary stats.

**Frontend store change:** `simulationStore` must store the per-node raw arrays (received from the worker alongside existing `rawALEValues`).

### R4: Theoretical PDF Computation (leaf nodes only)

For the pre-simulation preview and the post-simulation overlay on leaf nodes, the frontend needs to compute the theoretical PDF curve from the distribution parameters.

- **PERT:** Compute the Beta PDF using the PERT-to-Beta transformation (alpha/beta from min, mode, max with lambda=4). Sample ~200 points across [min, max].
- **Lognormal:** Standard lognormal PDF formula. Sample ~200 points across a reasonable range (e.g., P0.1 to P99.9).
- **Constant:** A single vertical line at the constant value.

This is a pure math function, no simulation required. It can run synchronously on the main thread.

### R5: Performance Considerations

Storing raw LEF arrays for every node increases memory usage:
- 10,000 iterations x N nodes x 8 bytes per float64 = ~80 KB per node
- A 20-node tree = ~1.6 MB (acceptable)
- A 100-node tree at 100,000 iterations = ~80 MB (may need mitigation)

**Mitigations (implement if needed, not in MVP of this feature):**
- Cap raw array storage to a configurable max (e.g., 50,000 samples; downsample if iterations exceed this)
- Option to disable per-node raw storage
- Do NOT persist rawLEF to saved scenario JSON files (same approach as existing rawALEValues which are already not persisted)

### R6: State Transitions

| State | Sparkline shows | Panel chart shows |
|-------|----------------|-------------------|
| Leaf, no distribution set | Empty / dashed outline | "Configure LEF distribution" message |
| Leaf, distribution set, no sim | Theoretical PDF | Theoretical PDF with axes |
| Leaf, distribution set, sim run | Simulated histogram | PDF overlay + simulated histogram |
| Gate, no sim | Empty / dashed outline | "Run simulation to see distribution" |
| Gate, sim run | Simulated histogram | Simulated histogram with axes |
| Any node, sim outdated | Faded/dimmed previous curve | Previous curve with "outdated" badge |

## Acceptance Criteria

1. Every leaf node with a configured distribution shows a sparkline on the canvas (pre- and post-simulation).
2. Every gate node shows a sparkline after simulation has been run.
3. Selecting any node shows the full distribution chart in the property panel.
4. Leaf node panel chart overlays theoretical PDF and simulated histogram after simulation.
5. Percentile markers (P10, P50, P90) appear on the panel chart when simulation data is available.
6. `SimulationResult.perNode` includes `rawLEF` arrays after simulation.
7. Existing saved scenarios (without `rawLEF`) load without errors.
8. No perceptible UI lag when rendering sparklines on a 20-node tree.

## Dependencies & Affected Components

| Component | Change type | Owner |
|-----------|------------|-------|
| `shared/src/index.ts` | Add `rawLEF` to `SimulationResult.perNode` | @backend |
| `frontend/src/workers/simulation.worker.ts` | Collect and return per-node raw LEF arrays | @frontend |
| `frontend/src/workers/fairEngine.ts` | Return raw LEF alongside existing stats | @frontend |
| `frontend/src/store/simulationStore.ts` | Store per-node raw LEF arrays | @frontend |
| `frontend/src/components/Canvas/nodes/LeafNode.tsx` | Embed sparkline component | @frontend |
| `frontend/src/components/Canvas/nodes/GateNode.tsx` | Embed sparkline component | @frontend |
| `frontend/src/components/PropertyPanel/LeafPropertyPanel.tsx` | Add distribution chart | @frontend |
| `frontend/src/components/PropertyPanel/GatePropertyPanel.tsx` | Add distribution chart | @frontend |
| New: `frontend/src/components/charts/DistributionSparkline.tsx` | Sparkline component | @frontend |
| New: `frontend/src/components/charts/DistributionChart.tsx` | Full panel chart | @frontend |
| New: `frontend/src/utils/pdfCalculators.ts` | Theoretical PDF math functions | @frontend |
| UX spec for sparkline sizing, colors, chart layout | New spec needed | @ux |

## Out of Scope

- Loss Magnitude distribution curves (scenario-level, not per-node)
- Cumulative distribution function (CDF) or exceedance curves (future feature)
- Exporting distribution data as CSV
- Bayesian prior/posterior overlay (future feature, depends on Bayesian update work)

## Open Questions for Human Review

1. Should the sparkline be visible by default, or togglable via a canvas toolbar button? (Concern: visual clutter on large trees)
2. For the "sim outdated" state, should we clear the curves entirely or show them faded? (Spec proposes faded)
