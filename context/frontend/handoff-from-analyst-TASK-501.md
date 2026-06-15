---
id: TASK-501
source: SPEC-SIMHARNESS
from: "@analyst"
to: "@frontend"
---

# Handoff: Simulation Test Harness Implementation

## Spec
`/context/analyst/spec-simulation-test-harness.md`

## Summary

Build a CLI-based simulation test harness that reads JSON test case files, runs the FAIR simulation engine directly in Node.js (no browser/worker), and outputs results for validation or human inspection.

## What to Implement

### Step 1: Extract simulationRunner.ts
- Extract orchestration loop from `simulation.worker.ts` into `simulationRunner.ts`
- Export `runSimulationSync()` and `computeStats()`
- Refactor worker to delegate to the new module
- Verify all existing tests pass

### Step 2: Build CLI Framework
- `frontend/cli/simharness.ts` — entry point, argument parsing, file discovery
- `frontend/cli/types.ts` — TypeScript interfaces (TestCase, Range, SimulationBounds, etc.)
- `frontend/cli/runner.ts` — test execution: calls simulationRunner + sensitivityEngine, checks bounds
- `frontend/cli/reporter.ts` — human-readable and JSON output formatters

### Step 3: Create Fixtures
- 9 test case JSON files in `frontend/cli/fixtures/` (see spec for list)

### Step 4: Wire Up
- Add `test:harness` and `test:harness:ci` npm scripts to `frontend/package.json`
- Add `tsx` devDependency if not already available

## Key Files to Read
- `frontend/src/workers/simulation.worker.ts` — source of extraction
- `frontend/src/workers/fairEngine.ts` — core engine (no changes needed)
- `frontend/src/workers/sensitivityEngine.ts` — sensitivity (no changes needed)
- `shared/src/index.ts` — type definitions

## Reviewers
- @test: fixture coverage
- @secarch: CLI input validation
