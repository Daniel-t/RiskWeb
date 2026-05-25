---
id: FEAT-COMPARE-EXCEEDANCE
type: feature-request
status: draft
priority: medium
assigned: null
reviewers: ["@frontend", "@ux"]
depends_on: ["TASK-324"]
modifies:
  - frontend/src/components/Comparison/ComparisonExceedance.tsx
  - frontend/src/components/Comparison/ScenarioComparisonModal.tsx
---

# Feature Request: Resilient Exceedance Curves in Scenario Comparison

## Problem Statement

When using the scenario comparison feature, the exceedance curve tab shows:

> "Exceedance curves require sample data from all scenarios."

This occurs because the `ComparisonExceedance` component requires `results.samples` on every compared scenario, but scenarios saved before the `samples` field was added to `SimulationResult` (or scenarios where results were restored without sample data) will not have this field populated.

The current behavior is a hard failure with no guidance — the user cannot tell which scenarios are missing data or what action to take.

## Root Cause Analysis

1. **Legacy saved scenarios**: Scenarios saved to IndexedDB before `samples` was added to `SimulationResult` have `results` but no `results.samples`.

2. **Lossy result restoration**: When a scenario is loaded from IndexedDB, `App.tsx` calls `simulationStore.setResults(scenario.results, [])` — the `SimulationResult` (including `samples` if present) is preserved, but this pattern means if the scenario is later re-saved without re-running the simulation, the stored data is only as complete as what IndexedDB had.

3. **All-or-nothing check**: `ComparisonExceedance.tsx:29` uses `scenarios.every(...)` — if even one scenario is missing samples, the entire chart is blocked with no indication of which scenario is the problem.

## Proposed Improvements

### 1. Per-scenario diagnostic messaging (minimum fix)

When `allHaveSamples` is false, identify and list the specific scenarios missing sample data. Display a message like:

> "The following scenarios are missing sample data for exceedance curves: **[Scenario A], [Scenario B]**. Re-run simulation on these scenarios and re-save to enable exceedance curves."

**Files affected**: `ComparisonExceedance.tsx`

### 2. Visual indicator in comparison picker modal

In `ScenarioComparisonModal`, add a subtle icon or tooltip on scenarios that have `results` but no `results.samples`, warning the user that exceedance curves won't be available unless they re-simulate.

This requires `getScenario()` to be called or the `listScenarios()` metadata to include a `hasSamples` flag.

**Preferred approach**: Add `hasSamples?: boolean` to `ScenarioMeta` and populate it in `storage.listScenarios()`. This avoids loading full scenario data just to check for sample existence.

**Files affected**: `ScenarioComparisonModal.tsx`, `shared/src/index.ts` (ScenarioMeta), `storage.ts`

### 3. Partial rendering with available data (stretch)

Render exceedance curves for the scenarios that *do* have samples and show a legend entry with a note for the missing ones. This gives the user partial utility rather than a complete block.

**Files affected**: `ComparisonExceedance.tsx`

## Recommended Implementation Order

1. **Phase 1** (quick win): Improvement #1 — diagnostic messaging. Low effort, immediate UX benefit.
2. **Phase 2**: Improvement #2 — picker warning. Prevents the problem before the user hits it.
3. **Phase 3** (optional): Improvement #3 — partial rendering. Only if users frequently compare mixed-vintage scenarios.

## Acceptance Criteria

- [ ] When exceedance curves cannot render, the UI names the specific scenarios missing sample data
- [ ] The message includes a clear remediation action (re-simulate and re-save)
- [ ] No regression to the histogram tab or other comparison features
- [ ] Scenarios with samples continue to render exceedance curves correctly

## Out of Scope

- Automatic re-simulation of scenarios missing samples (too expensive, requires user intent)
- Backfilling samples into legacy scenarios via migration (samples require full Monte Carlo run)
