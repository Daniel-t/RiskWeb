# Project Status

## Current Phase
Phase 4 Wave C (UI Implementation) -- READY

Phase 4 Wave B (Core Implementation) -- COMPLETE 2026-05-27
Phase 4 Wave A (Specs, Design & Verification) -- COMPLETE 2026-05-27

Phase 3 Wave D (Validation) -- IN PROGRESS (9/10 scenarios PASS, 1 deferred)
Phase 3 Wave C (UI + Visualization) -- COMPLETE 2026-05-26
Phase 3 Wave B (Types + Engine) -- COMPLETE 2026-05-26 (engine implemented ahead of spec approval)
Phase 3 Wave A (Specs & Design) -- COMPLETE 2026-05-26
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

## Phase 3 Wave A Summary (COMPLETE 2026-05-26)
- **TASK-301**: FAIR taxonomy expansion spec (TEF x Vulnerability) -- APPROVED
- **TASK-302**: Sensitivity analysis spec (control-toggle + OAT) -- APPROVED
- **TASK-303**: Loss exceedance curve spec -- APPROVED
- **TASK-304**: Scenario comparison spec -- APPROVED
- **TASK-305**: Phase 3 UI wireframes -- APPROVED (@ux, spec at `context/ux/spec-phase3-wireframes.md`)
  - Covers: results drawer tab restructure, TEF x Vulnerability toggle, sensitivity tornado charts, loss exceedance curve, scenario comparison view
  - Key design decision: two-level tab scheme (primary=visualization type, secondary=dataset toggle)
- All four specs have formal Acceptance Criteria sections
- Bayesian updates (E3.2) deferred to future phase

## Phase 3 Wave B Summary (COMPLETE 2026-05-26)
- Engine implemented ahead of spec approval; status corrected from "pending" to "done"
- **TASK-310**: Shared types extended — FAIRInputs (tef, vulnerability), SensitivityResult, SensitivityItem, samples on SimulationResult
- **TASK-311**: evaluateTree() handles TEF x Vulnerability decomposition (`fairEngine.ts:120-126`)
- **TASK-312**: Sensitivity engine complete — control-toggle + OAT sweep (`sensitivityEngine.ts`)
- **TASK-313**: Worker handles sensitivity messages + stores sorted ALE samples (capped at 10K)

## Phase 3 Wave D Validation (IN PROGRESS)
- **TASK-330**: Backward compatibility validation — 9/10 scenarios PASS, 1 DEFERRED (UI). Report: `context/analyst/validation-phase3-compat.md`
- **TASK-331**: Sensitivity correctness validation — 9/10 scenarios PASS, 1 DEFERRED (UI). Report: `context/analyst/validation-phase3-sensitivity.md`
  - Errata E1: `lmReduction` not included in OAT sweep (low severity, recommend @frontend fix)
  - Errata E2: Type values use camelCase (`controlToggle`/`oatSweep`) vs spec's kebab-case — spec updated to match implementation

## Phase 4 Wave B Summary (COMPLETE 2026-05-27)
- **TASK-410 DONE**: Worker wall-clock timeout (F-03) -- added missing timeout to sensitivity handler, verified start handler
- **TASK-411 DONE**: Extracted `buildExportPayload()` + `parseAndValidateImport()` + `sanitizeFilename()` from `fileIO.ts`
- **TASK-412 DONE**: CSV export engine (`frontend/src/services/csvExport.ts`) -- 4 formats: samples, summary, per-node, sensitivity
- **TASK-414 DONE**: `hasSamples` flag on `ScenarioMeta`, populated in storage, diagnostic UI in ComparisonExceedance + warning icons in picker
- **TASK-415 DONE**: 30+ design tokens in `:root`, complete `html[data-theme="dark"]` block, flash-free init script, hardcoded colors tokenized in LeafNode/GateNode/CSS

## Phase 4 Wave A (Specs, Design & Verification) -- COMPLETE 2026-05-27
- **TASK-401 DONE**: All 8 defect/security fixes verified PASS. Report: `context/test/verification-report-task401.md`
- **TASK-402 APPROVED**: Design system & theming spec. Spec: `context/ux/spec-design-system.md`
- **TASK-404 APPROVED**: CSV results export spec (4 single-format files). Spec: `context/analyst/spec-csv-export.md`
- **TASK-405 APPROVED**: Clipboard export/import spec. Spec: `context/analyst/spec-clipboard-export.md`
- **TASK-407 APPROVED**: Resilient exceedance curves spec. Spec: `context/analyst/spec-resilient-exceedance.md`
- **TASK-403 DEFERRED**: PDF report generation (future wave)
- **TASK-406 DEFERRED**: Performance optimization (future wave)

## Blockers
None

## Features Requiring Future Backend (Deferred)
- Multi-user collaboration / shared scenarios
- Centralized audit logging
- Real-time cross-device sync
