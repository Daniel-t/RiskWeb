---
id: TASK-005
title: Shared Data Model Specification
status: done
priority: high
assigned: analyst
reviewers: []
depends_on: []
modifies: [context/shared/spec-shared-types.md]
created: 2026-05-14
---

# TASK-005: Shared Data Model Specification

## Objective
Define the core TypeScript interfaces that both frontend and backend will share. This is a spec document -- no code.

## Deliverables

Write `context/analyst/spec-shared-types.md` defining these interfaces:

### Scenario (top-level container)
- `id: string` (UUID)
- `name: string`
- `description?: string`
- `nodes: AttackTreeNode[]`
- `edges: Edge[]`
- `simulationConfig: SimulationConfig`
- `results?: SimulationResult`
- `metadata: { created: string, modified: string }`

### AttackTreeNode
- `id: string`
- `type: "leaf" | "and" | "or"`
- `label: string`
- `position: { x: number, y: number }`
- `fairInputs?: FAIRInputs` (only on leaf nodes)

### Edge
- `id: string`
- `sourceId: string` (parent node)
- `targetId: string` (child node)

### FAIRInputs
- `lef: Distribution` (Loss Event Frequency)
- `lm: Distribution` (Loss Magnitude)

### Distribution
- `type: "pert" | "lognormal" | "constant"`
- `params: PERTParams | LognormalParams | ConstantParams`

### PERTParams
- `min: number`, `mode: number`, `max: number`

### LognormalParams
- `mu: number`, `sigma: number`

### ConstantParams
- `value: number`

### SimulationConfig
- `iterations: number` (default 10000)
- `seed?: number` (optional, for reproducibility)
- `confidenceIntervals: number[]` (default [0.10, 0.50, 0.90])

### SimulationResult
- `summary: { mean: number, stddev: number, percentiles: Record<number, number> }`
- `perNode: Record<string, { meanALE: number, percentiles: Record<number, number> }>`
- `iterations: number`
- `duration: number` (ms)

### ScenarioMeta (for list endpoints)
- `id: string`, `name: string`, `modified: string`

## Acceptance Criteria
- All interfaces cover the MVP data flow (tree -> FAIR inputs -> simulation -> results -> save/load)
- Types are extensible for future phases (controls, full FAIR taxonomy, Bayesian updates)
- Human reviews and approves before TASK-006 implementation begins
