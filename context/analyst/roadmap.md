---
id: ROADMAP-001
title: RiskWeb Implementation Roadmap
status: draft
assigned: analyst
created: 2026-05-14
---

# RiskWeb Implementation Roadmap

## Overview

This roadmap phases the RiskWeb project from zero code through full feature delivery. Phase 0 bootstraps the project. Phase 1 delivers a functional MVP. Phases 2-4 layer on controls, advanced analysis, and polish.

## Phased Roadmap

| Phase | Name | Goal |
|-------|------|------|
| 0 | Bootstrap | Context directories, project scaffolding, shared types |
| 1 | MVP | Vertical slice: attack tree + FAIR inputs + simulation + results + save/load |
| 2 | Controls & Enrichment | D3FEND control library, ATT&CK mapping, control impact on simulation |
| 3 | Advanced Analysis | Full FAIR taxonomy, scenario comparison, sensitivity analysis |
| 4 | Polish & Export | PDF reports, import/export, theming, performance |

---

## Phase 0: Bootstrap

| Task | Assigned | Priority | Depends On | Modifies |
|------|----------|----------|------------|----------|
| TASK-001: Create context directory structure | @orchestrator | high | none | `context/**` |
| TASK-002: Scaffold frontend (React + Vite + TS) | @frontend | high | TASK-001 | `frontend/**` |
| TASK-003: Scaffold backend (NestJS + TS) | @backend | high | TASK-001 | `backend/**` |
| TASK-004: Root configuration (.gitignore, README) | @orchestrator | high | none | `.gitignore`, `README.md` |
| TASK-005: Shared data model specification | @analyst | high | none | `context/analyst/spec-shared-types.md` |
| TASK-006: Implement shared types package | @backend | high | TASK-003, TASK-005 | `shared/**` |

### TASK-001: Create Context Directory Structure
Create all persona context folders with initial `context.md` files, `context/shared/CURRENT.md`, and `context/TASK_INDEX.md`. Reviewers: none.

### TASK-002: Scaffold Frontend
Init React/Vite/TypeScript project. Install core deps: react-flow (@xyflow/react), d3. Configure ESLint + Prettier. Verify `npm run dev` starts dev server. Reviewers: @secarch.

### TASK-003: Scaffold Backend
Init NestJS project. Configure CORS for localhost:5173. Create health check endpoint. Create `data/` directory for JSON storage. Verify `npm run start:dev`. Reviewers: @secarch.

### TASK-004: Root Configuration
Comprehensive .gitignore (node_modules, dist, .env, data/*.json, logs/). Root README with project description and dev setup. Reviewers: none.

### TASK-005: Shared Data Model Specification
Define core TypeScript interfaces (spec only, no code):
- `Scenario` (id, name, tree, simulationConfig, results, metadata)
- `AttackTreeNode` (id, type: and|or|leaf, label, parentId, fairInputs, position)
- `FAIRInputs` (lef: Distribution, lm: Distribution)
- `Distribution` (type: pert|lognormal|constant, params)
- `SimulationConfig` (iterations, seed, confidence intervals)
- `SimulationResult` (per-node and aggregate: mean, p10, p50, p90, samples)
- `Edge` (sourceId, targetId)

### TASK-006: Implement Shared Types Package
Create `shared/` local package with TypeScript interfaces from TASK-005 spec. Both frontend and backend reference it. Reviewers: @secarch, @analyst.

---

## Phase 1: MVP

See [mvp-plan.md](mvp-plan.md) for full task breakdown with dependencies, file ownership, and execution waves.

---

## Phase 2: Controls & Enrichment (Epics)

| Epic | Assigned | Description |
|------|----------|-------------|
| E2.1 | @threat | Curated ATT&CK technique catalog (JSON data) |
| E2.2 | @threat | D3FEND control mappings with probability/impact reduction factors |
| E2.3 | @analyst | Spec: how controls modify simulation (LEF/LM multipliers on leaf distributions) |
| E2.4 | @backend | Control library CRUD API + ATT&CK catalog endpoints |
| E2.5 | @ux | Control library browser UI, assignment interaction design |
| E2.6 | @frontend | Control library panel, drag-to-assign controls to nodes, visual indicators |
| E2.7 | @frontend | Update simulation engine to factor in applied controls |
| E2.8 | @analyst | Validation of control impact on simulation outputs |

## Phase 3: Advanced Analysis

**Scope:** Optional TEF x Vulnerability decomposition, sensitivity analysis (control-toggle + OAT), loss exceedance curves, cross-scenario comparison. Bayesian updates deferred.

See specs: [spec-fair-taxonomy.md](spec-fair-taxonomy.md), [spec-sensitivity.md](spec-sensitivity.md), [spec-loss-exceedance.md](spec-loss-exceedance.md), [spec-scenario-comparison.md](spec-scenario-comparison.md).

### Wave A -- Specs & Design

| Epic | Assigned | Description | Spec |
|------|----------|-------------|------|
| E3.1 | @analyst | FAIR taxonomy expansion: optional TEF x Vulnerability at leaves | spec-fair-taxonomy.md |
| E3.3 | @analyst | Sensitivity analysis: control-toggle tornado + OAT input sweep | spec-sensitivity.md |
| E3.5 | @analyst | Loss exceedance curve (complementary CDF) | spec-loss-exceedance.md |
| E3.7 | @analyst | Scenario comparison (2-4 saved scenarios) | spec-scenario-comparison.md |
| E3.UX | @ux | UI wireframes for all Phase 3 features | wireframes-phase3.md |

### Wave B -- Implementation (Types + Engine)

| Task | Assigned | Depends On | Modifies |
|------|----------|------------|----------|
| Extend FAIRInputs with optional tef/vulnerability | @frontend | E3.1 | shared/src/index.ts |
| Add SensitivityResult/SensitivityItem types | @frontend | E3.3 | shared/src/index.ts |
| Add samples[] to SimulationResult | @frontend | E3.5 | shared/src/index.ts |
| Update evaluateTree() for TEF x Vuln | @frontend | types | frontend/src/workers/fairEngine.ts |
| Sensitivity engine (control toggle + OAT) | @frontend | E3.3 | frontend/src/workers/ |
| Update simulation worker for samples + sensitivity messages | @frontend | above | frontend/src/workers/simulation.worker.ts |

### Wave C -- Implementation (UI + Visualization)

| Task | Assigned | Depends On | Modifies |
|------|----------|------------|----------|
| TEF/Vuln toggle in property panel | @frontend | Wave B types | frontend/src/components/PropertyPanel/ |
| Tornado chart component | @frontend | Wave B engine | frontend/src/components/Simulation/ (new) |
| Loss exceedance curve component | @frontend | E3.5 | frontend/src/components/Simulation/ (new) |
| Results drawer: add LEC + sensitivity tabs | @frontend | above | frontend/src/components/Layout/ResultsDrawer.tsx |
| Scenario comparison picker + view | @frontend | E3.7 | frontend/src/components/ (new) |

### Wave D -- Integration & Validation

| Task | Assigned | Depends On | Modifies |
|------|----------|------------|----------|
| Backward compatibility validation | @analyst | Wave B+C | context/analyst/ |
| Sensitivity correctness validation | @analyst | Wave C | context/analyst/ |
| Test coverage (unit + integration) | @test | Wave B+C | frontend/src/__tests__/ |
| Security review | @secarch | Wave B+C | context/secarch/ |

### Deferred from Phase 3

| Feature | Reason |
|---------|--------|
| E3.2 Bayesian updates | Complexity; manual distribution entry suffices for now |
| Per-node Loss Magnitude | Keep LM scenario-level; decomposition not needed yet |
| Contact Freq / Prob of Action (TEF sub-decomposition) | Diminishing returns on analytical depth |
| Primary/Secondary Loss decomposition | Requires per-node LM first |

## Phase 4: Polish & Export (Epics)

| Epic | Assigned | Description |
|------|----------|-------------|
| E4.1 | @ux | Design system and theming (light/dark mode) |
| E4.2 | @frontend | PDF report generation (tree visualization + inputs + results) |
| E4.3 | @backend | JSON model download/upload, CSV results export |
| E4.4 | @frontend | Performance optimization (virtualization for large trees, worker pool) |
| E4.5 | @secarch | Comprehensive security review of full application |
| E4.6 | @backend | Database persistence migration path documentation |

---

## Key Design Decisions

1. **Simulation is client-side**: Monte Carlo runs in a Web Worker. Backend is persistence only.
2. **Shared types package**: `shared/` directory with TS interfaces prevents API contract drift.
3. **State management**: Zustand store for tree and simulation state (single source of truth while editing).
4. **MVP scope exclusions**: No controls/D3FEND, no full FAIR taxonomy, no Bayesian updates, no scenario comparison, no export/import, no theming, no auth.
5. **Spec-first workflow**: All spec tasks must be human-approved before dependent implementation begins.
6. **No authentication**: Single-user, local-only for all planned phases unless multi-user is explicitly scoped.
