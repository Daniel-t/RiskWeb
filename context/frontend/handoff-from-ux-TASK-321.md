---
id: HANDOFF-UX-321
source_task: TASK-305
target_task: TASK-321
from: ux
to: frontend
date: 2026-05-26
---

# Handoff: Sensitivity Tornado Chart Component

**From:** @ux (TASK-305, approved wireframes)
**To:** @frontend (TASK-321)

## Wireframe Reference

`context/ux/spec-phase3-wireframes.md` -- Section 2 (Sensitivity Tornado Charts)

## Summary

Build the sensitivity analysis UI: a `SensitivityPanel` with control bar, progress indicator, and D3-based `TornadoChart` that supports both Control Impact and Input OAT modes.

## Key Deliverables

1. **`SensitivityPanel.tsx`** (new) -- container for sensitivity tab content
2. **`TornadoChart.tsx`** (new, D3-based) -- horizontal bar chart supporting both modes
3. **Control bar** with Run button, Top-N dropdown, and sub-toggle (Control Impact / Input OAT)
4. **Progress indicator** during sensitivity runs

## Component Hierarchy

```
SensitivityPanel (NEW)
  +-- SensitivityControlBar (NEW)
  |     +-- RunSensitivityButton
  |     +-- TopNDropdown (5, 10, 15, 20, All)
  |     +-- SubToggle (Control Impact | Input OAT)
  +-- SensitivityProgress (conditional)
  +-- TornadoChart (NEW, D3)
  +-- EmptyState / ErrorState (conditional)
```

## TornadoChart Props

```typescript
interface TornadoChartProps {
  items: SensitivityItem[];
  baselineALE: number;
  mode: 'controlToggle' | 'oatSweep';
  topN: number;
}
```

Uses SVG + ResizeObserver pattern from `ALEHistogram.tsx`.

## Visual Design

### Control Impact Mode
- Bars extend rightward from baseline ALE (all controls on)
- Bar color by category: preventive=`#3b82f6`, detective=`#f59e0b`, corrective=`#10b981`
- Bar height: 24px, gap: 4px
- Y-axis: control names (truncated 20 chars) with category badge (P/D/C pill)
- Baseline shown as vertical dashed line

### Input OAT Mode
- Bidirectional bars from center (all inputs at expected)
- Left bar (P10): lighter fill; Right bar (P90): darker fill
- Color by category: blue for LEF/TEF/Vuln, green for LM, orange for control reductions
- Y-axis: "Node: {label} > {field}" format

### Hover Tooltip
Control Impact: show control name, baseline ALE, ALE w/o control, delta + percentage.
Input OAT: show input name, P10 value + ALE, P90 value + ALE, swing.

## Empty & Error States

| State | Display |
|-------|---------|
| No results | Tab disabled, tooltip "Run a simulation first" |
| Not run yet | Centered prompt + Run button |
| No controls | "No controls assigned..." message, OAT still works |
| All constants | "All input distributions are constant..." message |
| Running | Progress bar + Cancel button |
| Error | Red banner with error message |

## Data Model Reference

- `shared/src/index.ts`: `SensitivityResult`, `SensitivityItem`
- Engine: `sensitivityEngine.ts` (TASK-312, done)
- Worker messages: `sensitivity-progress`, `sensitivity-result`
- Spec: `context/analyst/spec-sensitivity.md` (TASK-302, approved)

## Acceptance Criteria (from spec)

- [ ] Tornado chart displays bars sorted by influence (most influential at top)
- [ ] Control-toggle shows unidirectional bars; OAT shows bidirectional bars
- [ ] Worker emits progress messages shown in UI
- [ ] Top-N filtering works correctly
- [ ] Empty states handled with appropriate messages
