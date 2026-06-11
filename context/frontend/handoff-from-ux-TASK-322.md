---
id: HANDOFF-UX-322
source_task: TASK-305
target_task: TASK-322
from: ux
to: frontend
date: 2026-05-26
---

# Handoff: Loss Exceedance Curve Component

**From:** @ux (TASK-305, approved wireframes)
**To:** @frontend (TASK-322)

## Wireframe Reference

`context/ux/spec-phase3-wireframes.md` -- Section 3 (Loss Exceedance Curve)

## Summary

Build the exceedance tab: a `ExceedancePanel` with VaR readouts (left, 30%) and a D3 loss exceedance curve (right, 70%). Supports single-dataset and compare overlay modes.

## Key Deliverables

1. **`ExceedancePanel.tsx`** (new) -- flex container (30/70 split)
2. **`VaRReadouts.tsx`** (new) -- key metrics display (VaR 90%, 95%, Mean, Median)
3. **`LossExceedanceCurve.tsx`** (new, D3-based) -- complementary CDF line chart

## Component Hierarchy

```
ExceedancePanel (NEW)
  +-- VaRReadouts (NEW)
  +-- LossExceedanceCurve (NEW, D3)
```

## VaR Readouts Styling

- Metric label: `fontSize: 11`, `fontWeight: 600`, `color: var(--text-muted)`, uppercase
- Metric value: `fontSize: 20`, `fontWeight: 700`, `fontFamily: var(--font-mono)`
- Sub-text: `fontSize: 11`, `color: var(--text-muted)`, italic
- In Compare mode: side-by-side columns with "Reduction at P90" summary

## LEC Chart Design

- X-axis: Loss amount ($), linear by default, auto log-scale when max/min > 1000
- Y-axis: Exceedance probability 0-100%, linear
- Single mode: solid blue line `#3b82f6`, 2px stroke, 8% opacity fill
- Compare mode: dashed gray baseline `#9CA3AF` 60% + solid blue controlled
- VaR 90%/95% annotations as horizontal dashed lines to curve intersection
- Mean ALE as vertical dotted line

## Hover Interaction

- Crosshair follows cursor (vertical + horizontal lines)
- Tooltip: "P(Loss > $X) = Y%" using binary search on sorted samples
- Tooltip: `fontSize: 12`, white bg, `boxShadow: 0 2px 8px rgba(0,0,0,0.12)`, `borderRadius: 4`

## State Descriptions

| State | Display |
|-------|---------|
| No results | Tab disabled |
| Results but no samples | "Re-run simulation to generate" message |
| Results with samples | Full chart + VaR readouts |
| Compare, both have samples | Overlay curves + side-by-side readouts |
| Compare, only one has samples | Show available curve + note |
| < 100 iterations | Amber banner about jagged curve |
| Deterministic | Vertical step line + "Deterministic scenario" note |

## Data Model Reference

- `SimulationResult.samples?: number[]` (sorted ascending, capped at 10K)
- `SimulationResult.summary.percentiles` for VaR values
- Spec: `context/analyst/spec-loss-exceedance.md` (TASK-303, approved)

## Acceptance Criteria (from spec)

- [ ] LEC renders as complementary CDF (X=loss, Y=exceedance probability)
- [ ] Overlay mode: baseline dashed gray, controlled solid blue
- [ ] VaR readouts display P90, P95, Mean, Median
- [ ] Hover crosshair with "P(Loss > $X) = Y%" tooltip
- [ ] Log scale auto-activates when max/min > 1000
- [ ] Graceful degradation when samples unavailable
