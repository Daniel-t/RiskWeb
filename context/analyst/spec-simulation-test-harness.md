---
id: SPEC-SIMHARNESS
status: approved
priority: medium
assigned: "@analyst"
reviewers: ["@frontend", "@test", "@secarch"]
---

# SPEC-SIMHARNESS: Programmatic Simulation Test Harness

## Objective

Provide a CLI-based test harness that can run RiskWeb simulation scenarios from JSON files and output results for programmatic validation or human inspection. This enables regression testing of simulation correctness, iterative exploration of scenario outputs, and CI integration -- all without requiring a browser.

## Background

The Monte Carlo simulation engine runs client-side in a Web Worker. The pure computation modules (`fairEngine.ts`, `distributions.ts`, `prng.ts`, `sensitivityEngine.ts`) have zero browser dependencies, but the orchestration layer in `simulation.worker.ts` is coupled to the Web Worker `postMessage` API. This spec defines how to extract that orchestration into a reusable module and build a CLI around it.

---

## Requirements

### R-1: Engine Extraction

Create `frontend/src/workers/simulationRunner.ts` that extracts the pure orchestration loop from `simulation.worker.ts`.

**R-1.1** Export a `runSimulationSync` function:
```typescript
export interface RunnerResult {
  result: SimulationResult;
  rawALEValues: number[];
  baselineResult?: SimulationResult;
  baselineRawALE?: number[];
}

export function runSimulationSync(
  scenario: Scenario,
  controls?: Control[],
  onProgress?: (percent: number) => void,
): RunnerResult;
```

**R-1.2** The function must implement the same dual-pass logic as the current worker: baseline (no control reductions) + controlled pass when `controlAssignments` has enabled controls. Both passes use the same seed.

**R-1.3** The `computeStats` helper (percentiles, mean, stddev) must also be exported from this module.

**R-1.4** Refactor `simulation.worker.ts` to import and delegate to `simulationRunner`. The worker becomes a thin `onmessage`/`postMessage` wrapper. No behavior change.

**R-1.5** All existing Vitest tests must pass after extraction without modification.

### R-2: CLI Tool

Create a CLI tool at `frontend/cli/simharness.ts` that reads test case JSON files and runs the simulation engine.

**R-2.1 Invocation:**
```bash
npx tsx cli/simharness.ts [options] <file|directory>...
```

**R-2.2 npm scripts** (add to `frontend/package.json`):
```json
"test:harness": "tsx cli/simharness.ts",
"test:harness:ci": "tsx cli/simharness.ts --json --strict cli/fixtures/"
```

**R-2.3 Modes:**
- `--mode=validation` (default): Check simulation results against `expected` bounds in the test case JSON. Fail if any bound is violated.
- `--mode=exploratory`: Run simulation and display results. Ignore `expected` bounds. Never fail on result values.

**R-2.4 Output flags:**
- Default: Human-readable formatted report
- `--json`: Machine-parseable JSON output
- `--verbose`: Per-node results, individual bound checks, timing details

**R-2.5 Override flags:**
- `--iterations=N`: Override iteration count for all test cases
- `--seed=N`: Override seed for all test cases
- `--timeout=N`: Per-case timeout in seconds (default: 120)
- `--strict`: Treat simulation warnings (orphaned controls, excessive reductions) as failures
- `--filter=<pattern>`: Glob pattern to filter test case names

**R-2.6 Exit codes:**

| Code | Meaning |
|---|---|
| 0 | All passed (validation) or completed (exploratory) |
| 1 | One or more validation bound failures |
| 2 | Runtime error (invalid scenario, timeout, crash) |
| 3 | CLI usage error (bad arguments, file not found) |

**R-2.7 Directory scanning:** When given a directory, recursively discover all `.json` files. Support test suite files (see R-3.3).

### R-3: Test Case JSON Format

**R-3.1 Top-level structure:**
```jsonc
{
  "name": "string (required)",
  "description": "string (optional)",
  "scenario": { /* Scenario object, same as JSON export format */ },
  "controls": [ /* Control[] (optional) */ ],
  "simulationConfigOverride": { /* partial SimulationConfig (optional) */ },
  "sensitivity": { "controlToggle": true, "oatSweep": true },
  "expected": { /* SimulationBounds (optional) */ },
  "expectedErrors": [ /* string[] (optional, for negative test cases) */ ]
}
```

**R-3.2 Bounds format** — `Range` is `{ "min": number, "max": number }`:
```jsonc
{
  "simulation": {
    "mean": { "min": 55000, "max": 75000 },
    "stddev": { "min": 10000, "max": 50000 },
    "percentiles": {
      "0.5": { "min": 50000, "max": 70000 },
      "0.9": { "min": 80000, "max": 120000 }
    },
    "perNode": {
      "leaf1": { "meanLEF": { "min": 4.0, "max": 7.0 } }
    }
  },
  "baseline": { /* same shape -- only when controls present */ },
  "sensitivity": {
    "controlToggle": {
      "items": {
        "control-id": {
          "delta": { "min": 5000, "max": 20000 },
          "direction": "positive"
        }
      }
    },
    "oatSweep": {
      "items": {
        "leaf1-lef": { "delta": { "min": 1000, "max": 50000 } }
      }
    }
  }
}
```

Validation logic: `actual >= range.min && actual <= range.max`. Only specified bounds are checked; omitted fields are not validated.

**R-3.3 Error test cases:** When `expectedErrors` is present, the harness runs `validateScenario()`, collects errors, and checks each expected string appears (substring match) in actual errors. Simulation is skipped.

**R-3.4 Suite files (optional):**
```jsonc
{
  "suite": "Core Simulation Regression",
  "cases": [ "single-leaf-constant.json", "two-leaf-or-gate.json" ]
}
```
Paths relative to suite file directory.

### R-4: Output Formats

**R-4.1 Human-readable:**
```
RiskWeb Simulation Test Harness
================================

[PASS] single-leaf-constant.json (0.12s)
  Mean ALE: $50,000.00 [expected: $45,000-$55,000]
  P90:      $68,000.00 [expected: $60,000-$80,000]

[FAIL] controls-lef-reduction.json (0.34s)
  Mean ALE: $72,000.00 [expected: $40,000-$60,000] << OUT OF BOUNDS

================================
Results: 1 passed, 1 failed (2 total)
```

**R-4.2 JSON:**
```jsonc
{
  "harness": "riskweb-simharness",
  "summary": { "total": 2, "passed": 1, "failed": 1, "errors": 0, "duration": 460 },
  "results": [
    {
      "file": "single-leaf-constant.json",
      "name": "...",
      "status": "pass",
      "duration": 120,
      "simulation": { "mean": 50000, "stddev": 12345, "percentiles": { ... }, "iterations": 10000 },
      "baseline": null,
      "sensitivity": null,
      "bounds": [ { "field": "mean", "actual": 50000, "min": 45000, "max": 55000, "pass": true } ]
    }
  ]
}
```

### R-5: Feature Coverage

The harness must support:

| Feature | Details |
|---|---|
| Core simulation | Tree evaluation (OR/AND gates), PERT/lognormal/constant distributions, seeded PRNG |
| TEF x Vulnerability | Leaf decomposition via `tef` and `vulnerability` fields in `fairInputs` |
| Controls - LEF | `lefReduction` applied to leaf nodes, multiplicative stacking |
| Controls - LM | `lmReduction` applied to scenario-level loss magnitude |
| Baseline comparison | Dual-pass: baseline (no reductions) + controlled, same seed |
| Sensitivity - toggle | Control toggle analysis via `runControlToggle()` |
| Sensitivity - OAT | One-at-a-time sweep via `runOATSweep()` |
| Validation errors | Negative test cases with `expectedErrors` |

### R-6: File Layout

```
frontend/
  src/workers/
    simulationRunner.ts        # NEW
    simulation.worker.ts       # MODIFIED
  cli/
    simharness.ts              # CLI entry point
    types.ts                   # TestCase, Range, SimulationBounds
    runner.ts                  # Execution logic
    reporter.ts                # Output formatters
    fixtures/                  # Test case JSON files
```

---

## Minimum Fixture Set

| Fixture | Purpose |
|---|---|
| `single-leaf-constant.json` | Constant LEF + LM, deterministic sanity check |
| `two-leaf-or-gate.json` | OR gate with PERT distributions, statistical bounds |
| `and-gate-decomposition.json` | AND gate with TEF x Vulnerability |
| `controls-lef-reduction.json` | Control with LEF reduction, baseline vs controlled |
| `controls-lm-reduction.json` | Control with LM reduction |
| `sensitivity-toggle.json` | Control toggle sensitivity |
| `sensitivity-oat.json` | OAT sweep sensitivity |
| `validation-no-nodes.json` | Error: empty scenario |
| `validation-bad-pert.json` | Error: invalid PERT params |

---

## Acceptance Criteria

1. `npm run test:harness cli/fixtures/single-leaf-constant.json` runs deterministic scenario and passes
2. `npm run test:harness --mode=exploratory cli/fixtures/` runs all fixtures and displays results without errors
3. `npm run test:harness:ci` passes all fixtures, exits with code 0
4. `--json` flag produces valid JSON matching R-4.2 schema
5. A fixture with intentionally out-of-bounds `expected` values exits with code 1
6. Error test cases (`expectedErrors`) correctly match validation errors
7. All existing Vitest tests pass after `simulationRunner.ts` extraction
8. Sensitivity analysis fixtures produce meaningful results (items with non-zero deltas)

---

## Dependencies

- Depends on existing engine modules: `fairEngine.ts`, `distributions.ts`, `prng.ts`, `sensitivityEngine.ts`
- Depends on shared types: `Scenario`, `SimulationResult`, `Control`, `SensitivityResult`
- Requires `tsx` as devDependency (may already be available transitively via Vitest)

## Handoff

- Implementation: @frontend (TASK-501)
- Review: @test (fixture coverage), @secarch (CLI input validation, no path traversal)
