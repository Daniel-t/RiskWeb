---
id: SPEC-CONTROLCHART
from: "@analyst"
to: "@frontend"
date: 2026-06-15
spec: context/analyst/spec-control-chart-bidirectional.md
---

# Handoff: Bidirectional Control Impact + Shapley Attribution

## Summary

Replace the current `controlToggle` mode in `SensitivityPanel`/`TornadoChart` with two new chart views:

1. **Control Impact (Bidirectional)** -- Standalone (left bar) vs. Marginal (right bar) per control
2. **Shapley Attribution** -- Fair-share decomposition, bars sum to total

Plus the existing **Input Sensitivity** (OAT) remains unchanged as a third tab.

## Key Files to Modify

| File | Change |
|------|--------|
| `shared/src/index.ts` | Add `ControlImpactItem`, `ControlImpactResult`, `ShapleyItem`, `ShapleyResult` types |
| `frontend/src/workers/sensitivityEngine.ts` | Add `runControlBidirectional()` and `runShapleyAttribution()` |
| `frontend/src/components/Simulation/TornadoChart.tsx` | Add bidirectional rendering mode (center axis, left/right bars) |
| `frontend/src/components/Simulation/SensitivityPanel.tsx` | Three tabs, lazy computation, cache results |
| New: `frontend/src/components/Simulation/ShapleyChart.tsx` | Dedicated Shapley horizontal bar chart |

## Implementation Notes

- **Reuse dual-pass results:** `baselineResult` (no controls) and `result` (all controls) from the existing simulation run can be reused -- avoid redundant runs
- **Existing `runControlToggle()`:** The toggle runs (all-except-one) already exist in `sensitivityEngine.ts`. Extend rather than rewrite -- add solo runs and wrap both in `runControlBidirectional()`
- **Shapley exact threshold:** Default 10, configurable. Use Monte Carlo sampling (200 permutations) above threshold. Cache subset ALE results across permutations.
- **Negative clamp:** Clamp any negative reduction values to 0 (floating-point noise)
- **Shapley normalization:** After sampling, normalize so values sum exactly to `totalCombinedReduction`

## Full Spec

See `context/analyst/spec-control-chart-bidirectional.md` for complete types, formulas, visual design, edge cases, and acceptance criteria (AC-1 through AC-10).
