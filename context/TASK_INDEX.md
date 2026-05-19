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

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-212 | Control Zustand store + IndexedDB storage | @frontend | pending | high | TASK-206, TASK-204 |
| TASK-213 | Control library browser panel | @frontend | pending | high | TASK-212 |
| TASK-214 | ATT&CK/D3FEND catalog browser (client-side) | @frontend | pending | medium | TASK-212 |
| TASK-215 | Control-to-node assignment interaction | @frontend | pending | high | TASK-213 |
| TASK-216 | Visual control badges on leaf nodes | @frontend | pending | medium | TASK-215 |
| TASK-217 | Node controls panel in PropertyPanel | @frontend | pending | high | TASK-215 |
| TASK-218 | Update simulation engine for control reductions | @frontend | pending | high | TASK-203, TASK-206, TASK-215 |
| TASK-219 | Control CRUD UI (create/edit/delete) | @frontend | pending | medium | TASK-213 |

## Phase 2: Controls & Enrichment -- Wave D (Integration & Validation)

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-220 | Save/load with controlAssignments | @frontend | pending | high | TASK-218 |
| TASK-221 | Baseline vs. controlled ALE comparison view | @frontend | pending | medium | TASK-218 |
| TASK-222 | End-to-end validation (controls impact correctness) | @analyst | pending | high | TASK-218, TASK-220 |
| TASK-223 | Security review (Phase 2 frontend + storage) | @secarch | pending | high | TASK-212..TASK-221 |
