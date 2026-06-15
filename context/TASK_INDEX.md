# Task Index

## Phase 0: Bootstrap

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-001 | Create context directory structure | @orchestrator | done | high | -- |
| TASK-002 | Scaffold frontend (React + Vite + TS) | @frontend | done | high | TASK-001 |
| TASK-003 | ~~Scaffold backend (NestJS + TS)~~ | ~~@backend~~ | superseded | high | -- |
| TASK-004 | Root configuration | @orchestrator | done | high | -- |
| TASK-005 | Shared data model specification | @analyst | done | high | -- |
| TASK-006 | Implement shared types package | @frontend | done | high | TASK-005 |

## Phase 1: MVP -- Wave A (Specs) -- COMPLETE 2026-05-16

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-101 | FAIR simplified model calculation spec | @analyst | approved (revised) | high | TASK-005 |
| TASK-102 | Monte Carlo simulation engine spec | @analyst | approved | high | TASK-101 |
| TASK-103 | MVP UI layout & component wireframes | @ux | approved | high | -- |
| TASK-104 | Attack tree canvas interaction spec | @ux | approved | high | -- |

> **TASK-101 revision note (2026-05-16):** Model changed from per-leaf LEF+LM to frequency-only tree with scenario-level LM. Leaves contribute LEF only. LM is defined on the Scenario object and edited in the Scenario Info panel. Gates aggregate frequency only. ALE = aggregated_root_LEF x scenario_LM.

## Phase 1: MVP -- Waves B-F (Implementation) -- COMPLETE 2026-05-16

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-105 | ~~File storage service~~ | ~~@backend~~ | superseded | high | -- |
| TASK-106 | ~~Scenario CRUD API~~ | ~~@backend~~ | superseded | high | -- |
| TASK-107 | Monte Carlo simulation web worker | @frontend | done | high | TASK-101, TASK-102, TASK-006 |
| TASK-108 | App shell & layout | @frontend | done | high | TASK-002, TASK-103 |
| TASK-109 | Attack tree canvas | @frontend | done | high | TASK-104, TASK-006, TASK-108 |
| TASK-110 | FAIR input property panel | @frontend | done | high | TASK-101, TASK-103, TASK-109 |
| TASK-111 | Simulation trigger & results summary | @frontend | done | high | TASK-107, TASK-110 |
| TASK-112 | Save/load integration (IndexedDB) | @frontend | done | high | TASK-109 |
| TASK-113 | Results histogram visualization | @frontend | done | medium | TASK-111, TASK-103 |
| TASK-114 | MVP end-to-end validation | @analyst | done | high | TASK-111, TASK-112, TASK-113 |
| TASK-115 | Security review (MVP) | @secarch | done | high | TASK-107..TASK-113 |

## Phase 2: Controls & Enrichment -- Wave A (Specs & Data)

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-201 | ATT&CK technique catalog JSON (curated subset) | @threat | done | high | -- |
| TASK-202 | D3FEND control mappings JSON with effectiveness | @threat | done | high | -- |
| TASK-203 | Control impact on simulation spec | @analyst | approved | high | -- |
| TASK-204 | Control UI interaction design & wireframes | @ux | done | high | TASK-203 |
| TASK-205 | Shared types spec: Control, ControlAssignment, catalog | @analyst | approved | high | TASK-203 |

## Phase 2: Controls & Enrichment -- Wave B (SUPERSEDED by architecture migration)

> Backend tasks below were completed but the backend has been removed. Shared types remain in `shared/src/index.ts`. Functionality is now handled client-side.

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-206 | Implement shared types (Control, ControlAssignment, catalog) | @frontend | done | high | TASK-205 |
| TASK-207 | ~~Control library file storage service~~ | ~~@backend~~ | superseded | high | -- |
| TASK-208 | ~~Control library CRUD controller + DTOs~~ | ~~@backend~~ | superseded | high | -- |
| TASK-209 | ~~ATT&CK/D3FEND catalog module (static reader + endpoints)~~ | ~~@backend~~ | superseded | high | -- |
| TASK-210 | ~~Extend Scenario validation for controlAssignments[]~~ | ~~@backend~~ | superseded | medium | -- |
| TASK-211 | ~~Security review (Phase 2 backend)~~ | ~~@secarch~~ | cancelled | high | -- |

## Phase 2: Controls & Enrichment -- Wave C (Frontend Implementation)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-212 | Control Zustand store + IndexedDB storage | @frontend | done | high | TASK-206, TASK-204 | @secarch, @analyst, @test |
| TASK-213 | Control library browser panel | @frontend | done | high | TASK-212 | @ux, @secarch, @test |
| TASK-214 | ATT&CK/D3FEND catalog browser (client-side) | @frontend | done | medium | TASK-212 | @threat, @secarch, @test |
| TASK-215 | Control-to-node assignment interaction | @frontend | done | high | TASK-213 | @ux, @secarch, @test |
| TASK-216 | Visual control badges on leaf nodes | @frontend | done | medium | TASK-215 | @ux, @test |
| TASK-217 | Node controls panel in PropertyPanel | @frontend | done | high | TASK-215 | @ux, @analyst, @test |
| TASK-218 | Update simulation engine for control reductions | @frontend | done | high | TASK-203, TASK-206, TASK-215 | @analyst, @secarch, @test |
| TASK-219 | Control CRUD UI (create/edit/delete) | @frontend | done | medium | TASK-213 | @ux, @secarch, @test |

## Phase 2: Controls & Enrichment -- Wave C Gap Tasks

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-224 | Drag-drop control assignment from sidebar to canvas | @frontend | done | high | TASK-215 | @ux, @secarch, @test |
| TASK-225 | Override UI in NodeControlsSection | @frontend | done | high | TASK-217 | @ux, @analyst, @test |
| TASK-226 | Control badge polish (category colors + hover tooltip) | @frontend | done | medium | TASK-216 | @ux, @test |
| TASK-227 | Verify LM reduction path in simulation engine | @frontend | done | high | TASK-218 | @analyst, @secarch |
| TASK-228 | Test coverage for Wave C (unit + integration) | @test | done | high | TASK-212, TASK-218 | @analyst, @secarch |

## Phase 2: Controls & Enrichment -- Wave D (Integration & Validation)

> Wave D complete (2026-05-21). All 4 tasks done.

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-220 | Save/load with controlAssignments | @frontend | done | high | TASK-218, TASK-224..TASK-228 | @secarch, @test |
| TASK-221 | Baseline vs. controlled ALE comparison view | @frontend | done | medium | TASK-218, TASK-224..TASK-228 | @ux, @analyst, @test |
| TASK-222 | End-to-end validation (controls impact correctness) | @analyst | done | high | TASK-220, TASK-221 | @secarch, @test |
| TASK-223 | Security review (Phase 2 frontend + storage) | @secarch | done | high | TASK-220, TASK-221 | @analyst, @test |

## Phase 3: Advanced Analysis -- Wave A (Specs & Design) -- COMPLETE 2026-05-26

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-301 | FAIR taxonomy expansion spec (TEF x Vulnerability) | @analyst | approved | high | -- | @frontend, @secarch |
| TASK-302 | Sensitivity analysis spec (control-toggle + OAT) | @analyst | approved | high | -- | @frontend, @secarch |
| TASK-303 | Loss exceedance curve spec | @analyst | approved | medium | -- | @frontend, @ux |
| TASK-304 | Scenario comparison spec | @analyst | approved | medium | -- | @frontend, @ux |
| TASK-305 | Phase 3 UI wireframes | @ux | approved | high | TASK-301..TASK-304 | @frontend, @analyst |

## Phase 3: Advanced Analysis -- Wave B (Types + Engine) -- COMPLETE 2026-05-26

> Wave B engine already implemented ahead of spec approval. Types extended, TEF x Vulnerability in evaluateTree(), sensitivity engine (control-toggle + OAT), worker protocol with samples and sensitivity messages all in place.

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-310 | Extend FAIRInputs + add sensitivity types in shared | @frontend | done | high | TASK-301, TASK-302, TASK-303 | @analyst, @secarch |
| TASK-311 | Update evaluateTree() for TEF x Vulnerability | @frontend | done | high | TASK-310 | @analyst, @secarch |
| TASK-312 | Sensitivity engine (control-toggle + OAT sweep) | @frontend | done | high | TASK-310 | @analyst, @secarch |
| TASK-313 | Update simulation worker (samples + sensitivity messages) | @frontend | done | high | TASK-311, TASK-312 | @secarch |

## Phase 3: Advanced Analysis -- Wave C (UI + Visualization) -- COMPLETE 2026-05-26

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-320 | TEF/Vulnerability toggle in property panel | @frontend | done | high | TASK-311, TASK-305 | @ux, @analyst |
| TASK-321 | Sensitivity tornado chart component | @frontend | done | high | TASK-312, TASK-305 | @ux, @analyst |
| TASK-322 | Loss exceedance curve component | @frontend | done | medium | TASK-313, TASK-305 | @ux, @analyst |
| TASK-323 | Results drawer: add LEC + sensitivity tabs | @frontend | done | medium | TASK-321, TASK-322 | @ux |
| TASK-324 | Scenario comparison picker + view | @frontend | done | medium | TASK-313, TASK-305 | @ux, @analyst |

## Phase 3: Advanced Analysis -- Wave D (Integration & Validation)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-330 | Backward compatibility + migration validation | @analyst | pending | high | TASK-320..TASK-324 | @secarch, @test |
| TASK-331 | Sensitivity analysis correctness validation | @analyst | pending | high | TASK-321 | @secarch, @test |
| TASK-332 | Test coverage (unit + integration) | @test | pending | high | TASK-310..TASK-324 | @analyst, @secarch |
| TASK-333 | Security review (Phase 3) | @secarch | pending | high | TASK-310..TASK-324 | @analyst, @test |

## Defect Fixes

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| DEFECT-SAVE | Scenario save: rename overwrites original + import save error | @frontend | implemented (verify in TASK-401) | high | -- | @analyst, @secarch, @test |

## Feature Requests

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| FEAT-COMPARE-EXCEEDANCE | Resilient exceedance curves in scenario comparison | -- | superseded by TASK-407 | medium | TASK-324 | @frontend, @ux |
| FEAT-CLIPBOARD-EXPORT | Copy/import scenario JSON via clipboard | -- | superseded by TASK-405 | low | -- | @frontend, @ux, @secarch |

## Phase 4: Polish, Export & Fixes -- Wave A (Specs, Design & Verification)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-401 | Verify defect/security fixes already in codebase | @test | done | high | -- | @secarch, @analyst |
| TASK-402 | Design system & theming spec (light/dark) | @ux | approved | medium | -- | @frontend, @analyst |
| TASK-403 | PDF report generation spec (client-side) | @analyst | deferred (future wave) | medium | -- | @frontend, @ux |
| TASK-404 | CSV results export spec | @analyst | approved | low | -- | @frontend |
| TASK-405 | Clipboard export/import spec (refine draft) | @analyst | approved | low | -- | @frontend, @ux, @secarch |
| TASK-406 | Performance optimization spec | @analyst | deferred (future wave) | medium | -- | @frontend, @secarch |
| TASK-407 | Resilient exceedance curves spec (refine draft) | @analyst | approved | medium | -- | @frontend, @ux |

## Phase 4: Polish, Export & Fixes -- Wave B (Core Implementation)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-410 | Worker wall-clock timeout verification (F-03) | @frontend | done | medium | -- | @secarch, @test |
| TASK-411 | Extract shared export/import helpers from fileIO.ts | @frontend | done | medium | TASK-405 | @secarch, @test |
| TASK-412 | CSV results export engine | @frontend | done | low | TASK-404 | @analyst, @test |
| TASK-413 | ~~PDF report generation engine (jsPDF)~~ | ~~@frontend~~ | deferred | medium | TASK-403 | @analyst, @test |
| TASK-414 | Add hasSamples flag to ScenarioMeta + storage | @frontend | done | medium | TASK-407 | @analyst, @test |
| TASK-415 | Design system CSS tokens + theme infrastructure | @frontend | done | medium | TASK-402 | @ux, @test |

## Phase 4: Polish, Export & Fixes -- Wave C (UI Implementation)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-420 | Resilient exceedance curves UI | @frontend | pending | medium | TASK-414, TASK-407 | @ux, @analyst, @test |
| TASK-421 | Clipboard copy/import scenario JSON | @frontend | pending | low | TASK-411, TASK-405 | @ux, @secarch, @test |
| TASK-422 | CSV export button in results drawer | @frontend | pending | low | TASK-412 | @ux, @test |
| TASK-423 | ~~PDF report button + generation UI~~ | ~~@frontend~~ | deferred | medium | TASK-413 | @ux, @analyst, @test |
| TASK-424 | Light/dark theme toggle | @frontend | pending | medium | TASK-415, TASK-402 | @ux, @test |
| TASK-425 | Apply design system tokens across components | @frontend | pending | medium | TASK-415 | @ux, @test |
| TASK-426 | ~~React Flow virtualization for large trees~~ | ~~@frontend~~ | deferred | medium | TASK-406 | @secarch, @test |
| TASK-427 | ~~Worker pool for parallel sensitivity analysis~~ | ~~@frontend~~ | deferred | low | TASK-406 | @secarch, @test |

## Phase 4: Polish, Export & Fixes -- Wave D (Validation & Security Review)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-430 | End-to-end validation (all Phase 4 features) | @analyst | pending | high | TASK-420..TASK-427 | @secarch, @test |
| TASK-431 | Comprehensive security review (full app -- E4.5) | @secarch | pending | high | TASK-410..TASK-427 | @analyst, @test |
| TASK-432 | Test coverage (unit + integration) | @test | pending | high | TASK-410..TASK-427 | @analyst, @secarch |
| TASK-433 | Theme accessibility audit (WCAG contrast) | @ux | pending | medium | TASK-424, TASK-425 | @secarch, @test |

## Feature: Control Chart Enhancements (SPEC-CONTROLCHART)

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-501A | SPEC-CONTROLCHART: Bidirectional Control Impact + Shapley Attribution spec | @analyst | approved | medium | -- | @frontend, @ux, @secarch |
| TASK-502 | Extend shared types (ControlImpactResult, ShapleyResult) | @frontend | pending | medium | TASK-501A | @analyst, @secarch |
| TASK-503 | Bidirectional sensitivity engine (runControlBidirectional) | @frontend | pending | medium | TASK-502 | @analyst, @secarch |
| TASK-504 | Shapley attribution engine (runShapleyAttribution) | @frontend | pending | medium | TASK-502 | @analyst, @secarch |
| TASK-505 | Bidirectional TornadoChart rendering mode | @frontend | pending | medium | TASK-503 | @ux, @analyst |
| TASK-506 | ShapleyChart component (new) | @frontend | pending | medium | TASK-504 | @ux, @analyst |
| TASK-507 | SensitivityPanel 3-tab integration | @frontend | pending | medium | TASK-505, TASK-506 | @ux, @analyst |
| TASK-508 | Validation: control chart correctness | @analyst | pending | medium | TASK-507 | @secarch, @test |

## Phase 5: Testing Infrastructure

| ID | Title | Assigned | Status | Priority | Depends On | Reviewers |
|----|-------|----------|--------|----------|------------|-----------|
| TASK-501 | Simulation test harness CLI (SPEC-SIMHARNESS) | @frontend | pending | medium | -- | @test, @secarch, @analyst |
