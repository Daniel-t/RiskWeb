---
id: HANDOFF-UX-324
source_task: TASK-305
target_task: TASK-324
from: ux
to: frontend
date: 2026-05-26
---

# Handoff: Scenario Comparison Picker + View

**From:** @ux (TASK-305, approved wireframes)
**To:** @frontend (TASK-324)

## Wireframe Reference

`context/ux/spec-phase3-wireframes.md` -- Section 4 (Scenario Comparison)

## Summary

Build a scenario comparison feature: a picker modal to select 2-4 scenarios, and a comparison view that replaces the results drawer content with side-by-side stats, overlaid histograms, and overlaid exceedance curves.

## Key Deliverables

1. **`ScenarioComparisonModal.tsx`** (new) -- picker modal following `LoadScenarioModal` pattern
2. **`ComparisonView.tsx`** (new) -- full comparison layout replacing normal drawer content
3. **`ComparisonHeader.tsx`** (new) -- header with scenario names and Exit button
4. **`ComparisonCards.tsx`** (new) -- summary cards row
5. **`ComparisonStatsTable.tsx`** (new) -- side-by-side stats with deltas
6. **`ComparisonHistogram.tsx`** (new) -- N-overlay histogram
7. **`ComparisonExceedance.tsx`** (new) -- N-overlay LEC
8. **Update `TopBar.tsx`** -- add Compare button
9. **New `useComparisonStore`** (Zustand) -- ephemeral comparison state

## Component Hierarchy

```
TopBar (updated: Compare button)
ResultsDrawer
  +-- (normal mode) PrimaryTabBar + tabs
  +-- (comparison mode) ComparisonView
        +-- ComparisonHeader (Exit button)
        +-- ComparisonCards (row of summary cards)
        +-- WarningBanner (conditional: iteration count mismatch)
        +-- ComparisonContent
              +-- ComparisonStatsTable (40%)
              +-- ComparisonCharts (60%)
                    +-- mini tab toggle (Histogram | Exceedance)
                    +-- ComparisonHistogram
                    +-- ComparisonExceedance

ScenarioComparisonModal (modal)
```

## Comparison Colors

| Slot | Color | Hex |
|------|-------|-----|
| Reference | Gray | `#64748b` |
| Scenario B | Blue | `#3b82f6` |
| Scenario C | Orange | `#f59e0b` |
| Scenario D | Green | `#10b981` |

## Store Design (ephemeral, NOT persisted)

```typescript
interface ComparisonState {
  selectedScenarioIds: string[];  // 0-4 IDs
  referenceIndex: number;         // default 0
  isComparing: boolean;
}
```

## Picker Modal Design

- Reuses `LoadScenarioModal` pattern
- Checkbox selection (2-4 max)
- Unsimulated scenarios grayed out with tooltip "Run simulation first"
- Shows: name, Mean ALE, P90, last modified
- Reference indicator "(ref)" on first selected; "change" link to reassign
- Compare button enabled when 2+ simulated selected

## Stats Table

- One column per scenario, reference has no delta
- Delta rows: absolute + percentage vs reference
- Color: green = risk reduction, red = risk increase, gray < 5%

## Charts

- **Histogram**: overlaid, shared bin width from combined range, reference gray 40%, others colored 60%
- **Exceedance**: overlaid LEC, reference dashed gray, others solid colored. Only when all have `samples`.

## Warning Banner

Shown when any scenario's iteration count differs from reference by > 2x. Amber background `#fef3c7`.

## Data Model Reference

- Spec: `context/analyst/spec-scenario-comparison.md` (TASK-304, approved)
- `SimulationResult.samples` for exceedance overlay
- `SimulationResult.summary` for stats table

## Acceptance Criteria (from spec)

- [ ] User can select 2-4 saved, simulated scenarios for comparison
- [ ] First selected is reference; user can change it
- [ ] Summary stats table with Mean, StdDev, P10, P50, P90 and delta columns
- [ ] Delta colors: green (reduction), red (increase), gray (< 5%)
- [ ] Percentage delta "N/A" when reference metric is 0
- [ ] Overlaid histograms with shared bin width
- [ ] Overlaid LEC curves when all scenarios have `samples`
- [ ] Warning banner when iteration counts differ > 2x
- [ ] Comparison state ephemeral (Zustand only, not persisted)
- [ ] Removing scenario below 2 closes comparison view
- [ ] Compare button disabled with tooltip when < 2 scenarios saved
