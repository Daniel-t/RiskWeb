# Project Status

## Current Phase
Phase 3 Wave A (Specs & Design) -- IN PROGRESS 2026-05-21

Phase 2 Wave D (Integration & Validation) -- COMPLETE 2026-05-21

## Architecture
**Client-side SPA only.** Backend was removed 2026-05-17. All persistence uses browser IndexedDB with JSON export/import. Deployable as a static site.

Key services:
- `frontend/src/services/storage.ts` -- StoragePort interface + IndexedDB adapter
- `frontend/src/services/api.ts` -- wraps IndexedDB (same interface, no HTTP)
- `frontend/src/services/catalog.ts` -- ATT&CK/D3FEND data bundled from `shared/data/`
- `frontend/src/services/fileIO.ts` -- JSON export/import for scenarios
- `frontend/src/services/validate.ts` -- runtime validation for imported data

## Wave D Summary (COMPLETE 2026-05-21)
- **TASK-220**: Save/load with controlAssignments -- DONE
- **TASK-221**: Baseline vs. controlled ALE comparison view -- DONE
- **TASK-222**: End-to-end validation -- DONE (report: `/context/analyst/validation-wave-d.md`)
- **TASK-223**: Security review -- PASS (report: `/context/secarch/review-phase2.md`)
  - 2 Medium findings in `fileIO.ts` (file size limit, _exportedControls validation) -- fix before prod
  - Scenarios 9-10 manual UI validation still pending

## Wave C Summary (COMPLETE 2026-05-20)
All Wave C tasks done (TASK-212 through TASK-219, gap tasks TASK-224 through TASK-228).
- Control store, library panel, catalog browser, CRUD UI, assignment interaction, badges, override UI, simulation engine, test coverage -- all implemented.
- LM reduction code verified correct. `applyLmReductions()` extracted into `fairEngine.ts` with unit tests.

## Phase 1 Summary (COMPLETE 2026-05-16)
All MVP capabilities delivered and validated. Security review passed.

## Wave A Summary (COMPLETE)
All specs, data, and wireframes delivered and approved.

## Wave B Summary (SUPERSEDED)
Backend removed. Shared types remain in `shared/src/index.ts`. Client-side equivalents replace backend services.

## Workforce
- **@test persona active** -- QA/Test engineer, context at `/context/test/context.md`

## Phase 3 Wave A Summary (IN PROGRESS)
- **TASK-301**: FAIR taxonomy expansion spec (TEF x Vulnerability) -- DRAFT
- **TASK-302**: Sensitivity analysis spec (control-toggle + OAT) -- DRAFT
- **TASK-303**: Loss exceedance curve spec -- DRAFT
- **TASK-304**: Scenario comparison spec -- DRAFT
- **TASK-305**: Phase 3 UI wireframes -- APPROVED (@ux, spec at `context/ux/spec-phase3-wireframes.md`)
  - Covers: results drawer tab restructure, TEF x Vulnerability toggle, sensitivity tornado charts, loss exceedance curve, scenario comparison view
  - Key design decision: two-level tab scheme (primary=visualization type, secondary=dataset toggle)
- Bayesian updates (E3.2) deferred to future phase

## Blockers
None

## Features Requiring Future Backend (Deferred)
- Multi-user collaboration / shared scenarios
- Server-side PDF generation (alternative: client-side jsPDF)
- Centralized audit logging
- Real-time cross-device sync
