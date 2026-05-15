# Task Index

## Phase 0: Bootstrap

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-001 | Create context directory structure | @orchestrator | done | high | -- |
| TASK-002 | Scaffold frontend (React + Vite + TS) | @frontend | done | high | TASK-001 |
| TASK-003 | Scaffold backend (NestJS + TS) | @backend | done | high | TASK-001 |
| TASK-004 | Root configuration | @orchestrator | done | high | -- |
| TASK-005 | Shared data model specification | @analyst | done | high | -- |
| TASK-006 | Implement shared types package | @backend | done | high | TASK-003, TASK-005 |

## Phase 1: MVP -- Wave A (Specs) -- APPROVED 2026-05-16

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-101 | FAIR simplified model calculation spec | @analyst | approved (revised) | high | TASK-005 |
| TASK-102 | Monte Carlo simulation engine spec | @analyst | approved | high | TASK-101 |
| TASK-103 | MVP UI layout & component wireframes | @ux | approved | high | -- |
| TASK-104 | Attack tree canvas interaction spec | @ux | approved | high | -- |

> **TASK-101 revision note (2026-05-16):** Model changed from per-leaf LEF+LM to frequency-only tree with scenario-level LM. Leaves contribute LEF only. LM is defined on the Scenario object and edited in the Scenario Info panel. Gates aggregate frequency only. ALE = aggregated_root_LEF x scenario_LM.

## Phase 1: MVP -- Waves B-F (Implementation)

| ID | Title | Assigned | Status | Priority | Depends On |
|----|-------|----------|--------|----------|------------|
| TASK-105 | File storage service | @backend | done | high | TASK-006 |
| TASK-106 | Scenario CRUD API | @backend | done | high | TASK-105 |
| TASK-107 | Monte Carlo simulation web worker | @frontend | done | high | TASK-101, TASK-102, TASK-006 |
| TASK-108 | App shell & layout | @frontend | done | high | TASK-002, TASK-103 |
| TASK-109 | Attack tree canvas | @frontend | done | high | TASK-104, TASK-006, TASK-108 |
| TASK-110 | FAIR input property panel | @frontend | done | high | TASK-101, TASK-103, TASK-109 |
| TASK-111 | Simulation trigger & results summary | @frontend | done | high | TASK-107, TASK-110 |
| TASK-112 | Save/load integration | @frontend | done | high | TASK-106, TASK-109 |
| TASK-113 | Results histogram visualization | @frontend | done | medium | TASK-111, TASK-103 |
| TASK-114 | MVP end-to-end validation | @analyst | blocked | high | TASK-111, TASK-112, TASK-113 |
