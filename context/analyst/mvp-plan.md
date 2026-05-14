---
id: MVP-PLAN-001
title: RiskWeb MVP Detailed Plan
status: draft
assigned: analyst
created: 2026-05-14
---

# RiskWeb MVP Plan (Phase 1)

## MVP Definition

A user can: build an attack tree on a canvas, enter FAIR parameters on leaf nodes, run a Monte Carlo simulation, view summary statistics and a histogram, and save/load scenarios.

---

## Spec Tasks (Wave A)

All spec tasks run in parallel (across personas). Specs must be human-approved before dependent implementation tasks begin.

### TASK-101: FAIR Simplified Model Calculation Spec
- **Assigned**: @analyst | **Reviewers**: human | **Depends on**: TASK-005
- **Modifies**: `context/analyst/spec-fair-simplified-model.md`
- **Deliverables**:
  - **LEF** (Loss Event Frequency): per-leaf probability distribution
    - Supported types: PERT (min, mode, max), lognormal (mu, sigma), constant (value)
  - **LM** (Loss Magnitude): same distribution types, represents dollar loss per event
  - **AND gate aggregation**: combined LEF = product of child LEFs per iteration; combined LM = sum of child LMs
  - **OR gate aggregation**: combined LEF = 1 - product(1 - child_LEF_i); combined LM = weighted average by relative LEF contribution
  - **ALE** (Annualized Loss Expectancy): LEF * LM per iteration, aggregated across tree root
  - **Distribution sampling**: PERT via beta distribution transform, lognormal via standard sampling, constant returns fixed value
  - **Bayesian update stub**: define interface for future prior/posterior updating (not MVP, but data model accommodates)
- **Acceptance**: Formulas unambiguous; @backend and @frontend can implement without further clarification

### TASK-102: Monte Carlo Simulation Engine Spec
- **Assigned**: @analyst | **Reviewers**: human | **Depends on**: TASK-101
- **Modifies**: `context/analyst/spec-monte-carlo-engine.md`
- **Deliverables**:
  - **Architecture**: client-side Web Worker. Frontend posts scenario tree + config; worker returns results
  - **Iteration flow**: for each of N iterations (default 10,000): sample LEF/LM for every leaf, propagate through gates per TASK-101, compute root ALE
  - **Output**: per-iteration ALE array + summary stats (mean, P10, P50, P90, stddev) + per-node breakdown
  - **Progress reporting**: worker posts percentage-complete messages for UI progress bar
  - **Cancellation**: AbortController pattern for in-flight simulation
  - **Deterministic seeding**: optional seed for reproducible results
  - **Performance target**: 10,000 iterations on 20-node tree < 2 seconds
- **Acceptance**: Architecture clear for @frontend (worker setup) and engine logic

### TASK-103: MVP UI Layout & Component Wireframes
- **Assigned**: @ux | **Reviewers**: human | **Depends on**: none
- **Modifies**: `context/ux/spec-mvp-layout.md`
- **Deliverables**:
  - **App shell**: top nav bar (app title, scenario name, save/load/run buttons)
  - **Three-panel layout**: left sidebar (node palette/tree outline), center (React Flow canvas), right sidebar (property panel/FAIR inputs)
  - **Results panel**: bottom drawer, collapsed by default, expands on results
  - **Node palette**: draggable node types (leaf, AND gate, OR gate)
  - **Property panel**: leaf selected = FAIR input form; gate selected = gate type + children summary; nothing selected = scenario info
  - **Simulation trigger**: "Run Simulation" button with progress indicator
  - **Save/Load**: toolbar buttons; load opens scenario list dialog
  - **Desktop-only**: min 1280px width
  - **Component hierarchy**: list of React components with responsibilities
- **Acceptance**: Wireframes cover all MVP user flows; component list sufficient for @frontend

### TASK-104: Attack Tree Canvas Interaction Spec
- **Assigned**: @ux | **Reviewers**: human | **Depends on**: none
- **Modifies**: `context/ux/spec-attack-tree-interactions.md`
- **Deliverables**:
  - **Adding nodes**: drag from palette or right-click context menu
  - **Connecting nodes**: drag source handle to target; validate tree structure (no cycles, single root)
  - **Selecting**: click to select, highlights node, opens property panel
  - **Moving**: drag to reposition (free-form mode)
  - **Deleting**: Delete key or context menu; confirm if node has children; cascade or reparent
  - **Gate behavior**: AND/OR visually distinct (shape/color); type toggleable in property panel
  - **Auto-layout**: button triggers dagre layout (one-shot reformat, not persistent mode)
  - **Zoom/pan**: standard React Flow behavior
  - **Validation indicators**: warning badge on nodes missing FAIR inputs; "ready" indicator on complete nodes
  - **Custom node designs**: visual specs for leaf vs AND vs OR (shape, color, icon, label placement)
- **Acceptance**: Patterns specific enough for @frontend without ambiguity

---

## Implementation Tasks

### TASK-105: File Storage Service (Backend)
- **Assigned**: @backend | **Reviewers**: [secarch] | **Depends on**: TASK-006
- **Modifies**: `backend/src/storage/storage.service.ts`, `backend/src/storage/storage.module.ts`
- **Deliverables**:
  - `StorageService`: reads/writes JSON files to `data/scenarios/`
  - Methods: `list(): ScenarioMeta[]`, `get(id): Scenario`, `save(scenario): void`, `delete(id): void`
  - Each scenario stored as `{id}.json`; auto-generate UUID for new scenarios
  - Path traversal prevention (validate IDs are safe filenames)
- **Acceptance**: Unit tests pass; @secarch confirms no path traversal or injection

### TASK-106: Scenario CRUD API (Backend)
- **Assigned**: @backend | **Reviewers**: [secarch, analyst] | **Depends on**: TASK-105
- **Modifies**: `backend/src/scenarios/scenarios.controller.ts`, `backend/src/scenarios/scenarios.service.ts`, `backend/src/scenarios/scenarios.module.ts`
- **Deliverables**:
  - `GET /api/scenarios` -- list all (id, name, lastModified)
  - `GET /api/scenarios/:id` -- full scenario
  - `POST /api/scenarios` -- create new
  - `PUT /api/scenarios/:id` -- update
  - `DELETE /api/scenarios/:id` -- delete
  - Request validation with class-validator DTOs
  - Error handling (404, 400)
- **Acceptance**: All endpoints work; validation rejects malformed input; @analyst confirms API matches data model

### TASK-107: Monte Carlo Simulation Web Worker (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch, analyst] | **Depends on**: TASK-101, TASK-102, TASK-006
- **Modifies**: `frontend/src/workers/simulation.worker.ts`, `frontend/src/workers/distributions.ts`, `frontend/src/workers/fairEngine.ts`, `frontend/src/hooks/useSimulation.ts`
- **Deliverables**:
  - `distributions.ts`: sampling functions for PERT (beta transform), lognormal, constant
  - `fairEngine.ts`: tree traversal -- given sampled leaf values, propagate through AND/OR gates per TASK-101
  - `simulation.worker.ts`: Web Worker entry point, receives tree + config, runs N iterations, posts progress + results
  - `useSimulation.ts`: React hook managing worker lifecycle (run, cancel, progress, results, isRunning)
- **Acceptance**: Known constant-distribution test tree matches hand-calculated values; progress/cancellation work

### TASK-108: App Shell & Layout (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch, ux] | **Depends on**: TASK-002, TASK-103
- **Modifies**: `frontend/src/App.tsx`, `frontend/src/components/Layout/AppShell.tsx`, `frontend/src/components/Layout/TopBar.tsx`, `frontend/src/components/Layout/Sidebar.tsx`, `frontend/src/components/Layout/ResultsPanel.tsx`
- **Deliverables**:
  - Three-panel layout from TASK-103 wireframe
  - Top bar with app title, scenario name (editable), save/load/run buttons
  - Left sidebar (placeholder for node palette)
  - Right sidebar (placeholder for property panel)
  - Bottom results drawer (collapsed by default)
  - No routing library (single-page, single view)
- **Acceptance**: Layout matches wireframe at desktop sizes; @ux confirms

### TASK-109: Attack Tree Canvas (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch, ux, analyst] | **Depends on**: TASK-104, TASK-006, TASK-108
- **Modifies**: `frontend/src/components/Canvas/AttackTreeCanvas.tsx`, `frontend/src/components/Canvas/nodes/LeafNode.tsx`, `frontend/src/components/Canvas/nodes/GateNode.tsx`, `frontend/src/components/Canvas/NodePalette.tsx`, `frontend/src/store/treeStore.ts`
- **Deliverables**:
  - React Flow canvas with custom node types: LeafNode, ANDGate, ORGate
  - Node palette in left sidebar -- drag to add
  - Connection validation (no cycles, single root)
  - Selection handling updates right sidebar
  - Delete with confirmation
  - Auto-layout button (dagre)
  - Zustand store (`treeStore.ts`) as single source of truth for tree state (nodes + edges)
  - Warning badge on nodes missing FAIR inputs
- **Acceptance**: CRUD operations work; tree state maintained correctly; @ux and @analyst confirm

### TASK-110: FAIR Input Property Panel (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch, analyst, ux] | **Depends on**: TASK-101, TASK-103, TASK-109
- **Modifies**: `frontend/src/components/PropertyPanel/PropertyPanel.tsx`, `frontend/src/components/PropertyPanel/FAIRInputForm.tsx`, `frontend/src/components/PropertyPanel/DistributionInput.tsx`
- **Deliverables**:
  - Context-sensitive right sidebar based on selected node
  - Leaf nodes: FAIR form with LEF section (distribution type dropdown, parameter fields) and LM section (same)
  - Gates: display type (toggle AND/OR), children list
  - No selection: scenario-level info
  - Input validation (min < mode < max for PERT, sigma > 0 for lognormal)
  - Changes immediately update treeStore
- **Acceptance**: Inputs saved correctly; validation prevents invalid distributions; @analyst confirms parameters

### TASK-111: Simulation Trigger & Results Summary (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch, analyst] | **Depends on**: TASK-107, TASK-110
- **Modifies**: `frontend/src/components/Simulation/RunButton.tsx`, `frontend/src/components/Simulation/ProgressBar.tsx`, `frontend/src/components/Results/ResultsSummary.tsx`, `frontend/src/store/simulationStore.ts`
- **Deliverables**:
  - "Run Simulation" button in top bar; disabled when tree has validation errors
  - Progress bar during simulation
  - Simulation store holding results
  - Results summary in bottom drawer: mean ALE, P10, P50, P90, StdDev table
  - Per-node breakdown table
  - "Clear Results" button
- **Acceptance**: Run triggers sim, progress shown, results appear; @analyst validates stats

### TASK-112: Save/Load Integration (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch] | **Depends on**: TASK-106, TASK-109
- **Modifies**: `frontend/src/services/api.ts`, `frontend/src/components/SaveLoad/SaveButton.tsx`, `frontend/src/components/SaveLoad/LoadDialog.tsx`
- **Deliverables**:
  - API client (`api.ts`) wrapping fetch calls to backend CRUD endpoints
  - Save: serialize treeStore + simulationConfig to Scenario, POST/PUT to backend
  - Load dialog: fetch scenario list, display in modal, select to load into treeStore
  - New scenario button: reset treeStore
  - Dirty state indicator (unsaved changes)
- **Acceptance**: Save, close, reopen, load with full fidelity; dirty indicator works

### TASK-113: Results Histogram Visualization (Frontend)
- **Assigned**: @frontend | **Reviewers**: [secarch, analyst, ux] | **Depends on**: TASK-111, TASK-103
- **Modifies**: `frontend/src/components/Results/ALEHistogram.tsx`, `frontend/src/components/Results/chartUtils.ts`
- **Deliverables**:
  - D3 histogram of ALE distribution
  - X-axis: ALE dollar amounts (binned); Y-axis: frequency
  - Overlay lines for P10, P50, P90 percentiles
  - Tooltip on hover (bin range + count)
  - Responsive sizing within results panel
- **Acceptance**: Histogram renders correctly; percentile lines match summary stats; @ux and @analyst confirm

### TASK-114: MVP End-to-End Validation
- **Assigned**: @analyst | **Reviewers**: human | **Depends on**: TASK-111, TASK-112, TASK-113
- **Modifies**: `context/analyst/mvp-validation-report.md`
- **Deliverables**:
  - Manual walkthrough with test scenario: 1 root OR gate, 2 leaf nodes with known PERT distributions
  - Enter FAIR inputs, run simulation, verify results in expected range
  - Save scenario, reload, verify fidelity
  - Document bugs or spec deviations
- **Acceptance**: Human reviews validation report; all MVP capabilities functional

---

## Execution Waves

```
Wave A (parallel specs, no code dependencies):
  @analyst: TASK-101 -> TASK-102 (sequential)
  @ux:      TASK-103 + TASK-104 (parallel)

Wave B (after Phase 0 complete + relevant specs approved):
  @backend:  TASK-105 -> TASK-106 (sequential)
  @frontend: TASK-108 (needs TASK-103)
  @frontend: TASK-107 (needs TASK-101 + 102, parallel with TASK-108)

Wave C:
  @frontend: TASK-109 (needs TASK-108 + TASK-104)

Wave D:
  @frontend: TASK-110 (needs TASK-109)
  @frontend: TASK-112 (needs TASK-109 + TASK-106, can parallel TASK-110)

Wave E:
  @frontend: TASK-111 (needs TASK-107 + TASK-110)

Wave F:
  @frontend: TASK-113 (needs TASK-111)
  @analyst:  TASK-114 (needs all above)
```

## Parallelization Notes for @orchestrator

- **@analyst** and **@ux** work entirely in parallel during Wave A (different files)
- **@backend** and **@frontend** work in parallel during Wave B (different directories)
- Within @frontend, TASK-107 and TASK-108 can run in parallel (different file sets)
- TASK-110 and TASK-112 can run in parallel if treated as independent (different component directories)
- The critical path is: TASK-104 -> TASK-109 -> TASK-110 -> TASK-111 -> TASK-113 -> TASK-114

## Review Gates Summary

| Task | Required Reviewers |
|------|-------------------|
| TASK-105 | @secarch |
| TASK-106 | @secarch, @analyst |
| TASK-107 | @secarch, @analyst |
| TASK-108 | @secarch, @ux |
| TASK-109 | @secarch, @ux, @analyst |
| TASK-110 | @secarch, @analyst, @ux |
| TASK-111 | @secarch, @analyst |
| TASK-112 | @secarch |
| TASK-113 | @secarch, @analyst, @ux |
