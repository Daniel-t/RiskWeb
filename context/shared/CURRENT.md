# Project Status

## Current Phase
Architecture migration complete — backend removed, app is now fully client-side.
Phase 2 Wave C (frontend control implementation) is next.

## Architecture Change (2026-05-17)
**Backend removed.** All persistence moved to browser IndexedDB with JSON export/import. The NestJS backend was eliminated to simplify deployment and reduce complexity. The app is now a static SPA deployable anywhere.

Key changes:
- `backend/` directory deleted
- `frontend/src/services/storage.ts` — StoragePort interface + IndexedDB adapter
- `frontend/src/services/api.ts` — now wraps IndexedDB (same interface, no HTTP)
- `frontend/src/services/catalog.ts` — ATT&CK/D3FEND data bundled from `shared/data/`
- `frontend/src/services/fileIO.ts` — JSON export/import for scenarios
- `frontend/src/services/validate.ts` — runtime validation for imported data

## Phase 1 Summary (COMPLETE 2026-05-16)
All MVP capabilities delivered and validated. Security review passed (all HIGH+MEDIUM findings resolved). Cosmetic issues ISSUE-3, ISSUE-4 deferred.

## Wave A Summary (COMPLETE)
All specs, data, and wireframes delivered and approved.

## Wave B Summary (SUPERSEDED)
Backend tasks TASK-206 through TASK-210 were completed but are now superseded by the architecture migration. The shared types (TASK-206) remain in `shared/src/index.ts`. The backend CRUD, catalog module, and validation DTOs have been replaced by client-side equivalents.

- TASK-211 (@secarch): **cancelled** — Backend no longer exists; frontend security review needed instead

## Workforce Update
- **@test persona added** — QA/Test engineer responsible for test strategy, automated testing (Vitest, React Testing Library, Playwright), and feature validation. Context at `/context/test/context.md`.

## Blockers
None

## Next Steps
1. Wave C frontend implementation (TASK-212 through TASK-219) — re-scope to use client-side storage/catalog instead of backend APIs
2. Security review of client-side storage and import validation
3. Optionally fix Phase 1 cosmetic issues (ISSUE-3, ISSUE-4)

## Features Requiring Future Backend (Deferred)
- Multi-user collaboration / shared scenarios
- Server-side PDF generation (alternative: client-side jsPDF)
- Centralized audit logging
- Real-time cross-device sync
