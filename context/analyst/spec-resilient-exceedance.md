---
id: SPEC-RESILIENT-EXCEEDANCE
title: Resilient Exceedance Curves Specification
status: approved
assigned: analyst
epic: E4.3
depends_on: [FEAT-COMPARE-EXCEEDANCE, TASK-324]
created: 2026-05-25
modifies: context/analyst/spec-resilient-exceedance.md
---

# Resilient Exceedance Curves Specification

This document formalizes the FEAT-COMPARE-EXCEEDANCE draft into a spec. The goal is graceful degradation of exceedance curves when comparing scenarios that have mixed sample data availability.

Implementors: @frontend (type extension + UI). Reviewers: @ux (warning design).

---

## 1. Problem Statement

The scenario comparison exceedance tab shows a blanket error when any compared scenario lacks `results.samples`. This occurs with legacy scenarios saved before the `samples` field was added. The user gets no indication of which scenario is the problem or how to fix it.

See `context/analyst/task-FEAT-COMPARE-EXCEEDANCE.md` for full root cause analysis.

---

## 2. Solution: Two Improvements

### 2.1 Improvement 1: Per-Scenario Diagnostic Messaging

**When**: `ComparisonExceedance.tsx` detects that not all scenarios have samples.

**Behavior**: Instead of the generic message, display:

> **Exceedance curves unavailable for some scenarios.**
>
> The following scenarios are missing sample data:
> - **{Scenario A name}**
> - **{Scenario B name}**
>
> To fix: open each scenario, re-run the simulation, and re-save.

**Requirements**:
- List scenario names, not IDs
- Message must be styled as an informational callout (not an error)
- Scenarios WITH samples should still be listed as "ready" or omitted from the warning

### 2.2 Improvement 2: Picker Warning with `hasSamples` Flag

**When**: User opens the Scenario Comparison modal (`ScenarioComparisonModal.tsx`).

**Type extension**: Add `hasSamples?: boolean` to `ScenarioMeta` in `shared/src/index.ts`:

```typescript
export interface ScenarioMeta {
  id: string;
  name: string;
  modified: string;
  meanALE?: number;
  p90?: number;
  hasSamples?: boolean;  // NEW
}
```

**Storage update**: In `storage.listScenarios()` (or equivalent), populate `hasSamples` by checking whether the stored scenario has `results?.samples?.length > 0`.

**UI behavior**: In the comparison picker modal, scenarios where `hasSamples === false` display:
- A warning icon (e.g., amber triangle) next to the scenario name
- Tooltip: "Missing sample data -- exceedance curves unavailable. Re-run simulation and re-save."
- The scenario is still selectable (other comparison features like histograms work without samples)

---

## 3. Improvement 3: Partial Rendering (Stretch / Optional)

Render exceedance curves for scenarios that DO have samples and show a legend entry with a dashed line or "No data" note for missing scenarios. This is deferred unless users frequently compare mixed-vintage scenarios.

---

## 4. Files to Modify

| File | Change |
|------|--------|
| `shared/src/index.ts` | Add `hasSamples?: boolean` to `ScenarioMeta` |
| `frontend/src/services/storage.ts` | Populate `hasSamples` in `listScenarios()` |
| `frontend/src/components/Comparison/ComparisonExceedance.tsx` | Replace blanket error with per-scenario diagnostic |
| `frontend/src/components/Comparison/ScenarioComparisonModal.tsx` | Show warning icon on scenarios without samples |

---

## 5. Out of Scope

- Automatic re-simulation of legacy scenarios
- Backfilling samples via data migration
- Partial rendering of exceedance curves (stretch, deferred)

---

## 6. Acceptance Criteria

1. When exceedance curves cannot render, the UI names the specific scenarios missing sample data
2. The message includes a clear remediation action ("re-run simulation and re-save")
3. The comparison picker modal shows a warning icon on scenarios without sample data
4. Warning tooltip explains the issue and remediation
5. Scenarios without samples are still selectable for histogram comparison
6. No regression to the histogram tab or other comparison features
7. Scenarios with samples continue to render exceedance curves correctly
8. The `hasSamples` flag is correctly populated in `listScenarios()` for both legacy and new scenarios
