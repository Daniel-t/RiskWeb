---
id: HANDOFF-UX-323
source_task: TASK-305
target_task: TASK-323
from: ux
to: frontend
date: 2026-05-26
---

# Handoff: Results Drawer Tab Restructure (LEC + Sensitivity Tabs)

**From:** @ux (TASK-305, approved wireframes)
**To:** @frontend (TASK-323)

## Wireframe Reference

`context/ux/spec-phase3-wireframes.md` -- Section 0 (Results Drawer Tab Restructure)

## Summary

Restructure the results drawer from a single-level dataset toggle to a two-level tab scheme: primary tabs select the visualization type, secondary toggle selects the dataset.

## Tab Structure

### Primary Tabs (left-aligned, always visible when results exist)

| Tab | Content | Available When |
|-----|---------|----------------|
| **Distribution** | ResultsSummary + ALEHistogram (current layout) | Always |
| **Exceedance** | ExceedancePanel (TASK-322) | Always (needs `samples`) |
| **Sensitivity** | SensitivityPanel (TASK-321) | Sensitivity has been run |

### Secondary Dataset Toggle (right-aligned, unchanged)

| Toggle | Behavior |
|--------|----------|
| Controlled | Show controlled results only (default) |
| Baseline | Show baseline results only |
| Compare | Overlay both |

Secondary toggle only appears when `hasControls` is true (same as today). Sensitivity tab has its own internal sub-toggle and does not use the dataset toggle.

## Layout Wireframe

```
+--Results--[v]-------------------------------------------------------+
|  [Distribution]  [Exceedance]  [Sensitivity*]      Ctrl|Base|Cmp    |
|  ^^^^^^^^^^^^                                       ^^^^^^^^^^^^^^^  |
|  primary tabs (left)                   dataset toggle (right, same)  |
+----------------------------------------------------------------------+
```

## Styling

- Primary tabs: `fontSize: 12`, `fontWeight: 600`, `borderBottom: 2px` active indicator
- Distinct from the pill-button style of the dataset toggle
- Sensitivity tab shows a dot indicator if results are stale or not yet run

## State Management

Add to `simulationStore`:
- `activeView: 'distribution' | 'exceedance' | 'sensitivity'` (default: `'distribution'`)
- `setActiveView(view)` setter

## Files Modified

| File | Changes |
|------|---------|
| `ResultsDrawer.tsx` | Add `activeView` state, primary tab bar, conditional child rendering |
| `simulationStore.ts` | Add `activeView` + setter |

## Dependencies

- TASK-321 (`SensitivityPanel`) and TASK-322 (`ExceedancePanel`) provide the tab content
- This task wires them into the drawer with the tab structure

## Acceptance Criteria

- [ ] Three primary tabs visible: Distribution, Exceedance, Sensitivity
- [ ] Distribution tab shows existing ResultsSummary + ALEHistogram
- [ ] Exceedance tab renders ExceedancePanel
- [ ] Sensitivity tab renders SensitivityPanel
- [ ] Dataset toggle (Ctrl/Base/Cmp) works within Distribution and Exceedance tabs
- [ ] Sensitivity tab disabled when no sensitivity results exist
- [ ] Tab state persists in simulationStore
