---
id: HANDOFF-UX-320
source_task: TASK-305
target_task: TASK-320
from: ux
to: frontend
date: 2026-05-26
---

# Handoff: TEF/Vulnerability Toggle in Property Panel

**From:** @ux (TASK-305, approved wireframes)
**To:** @frontend (TASK-320)

## Wireframe Reference

`context/ux/spec-phase3-wireframes.md` -- Section 1 (TEF x Vulnerability Toggle)

## Summary

Add a frequency mode toggle to `LeafPropertyPanel` that lets users switch between direct LEF input (current behavior) and decomposed TEF x Vulnerability input.

## Key Deliverables

1. **`FrequencyModeSection.tsx`** (new component) -- wraps the toggle logic and conditional rendering
2. **Update `LeafPropertyPanel.tsx`** -- replace single LEF editor with `FrequencyModeSection`
3. **Update `LeafNode.tsx`** -- add "TEF x V" indicator on decomposed nodes (9px, muted, italic)
4. **Constrained `DistributionInput`** for Vulnerability -- clamp PERT min/mode/max and constant value to [0, 1]

## Component Hierarchy

```
LeafPropertyPanel
  +-- Label input (existing)
  +-- FrequencyModeSection (NEW)
  |     +-- if direct: DistributionInput(label="LEF")
  |     +-- if decomposed:
  |           +-- DistributionInput(label="TEF (attempts/yr)")
  |           +-- DistributionInput(label="Vulnerability (0-1)", constrained=true)
  |           +-- ExpectedLEFReadout (computed: E[TEF] * E[Vuln])
  |     +-- toggle link
  +-- DecomposedStatsReadout (conditional on results)
  +-- ValidationIndicator (existing, updated logic)
  +-- NodeControlsSection (existing)
```

## Interaction Rules

| Action | Behavior |
|--------|----------|
| Click "Decompose into TEF x Vulnerability" | Switch to decomposed mode. Auto-populate TEF from current LEF. Set Vulnerability to PERT(0, 0.5, 1). |
| Click "Use direct LEF instead" | Switch to direct mode. Auto-populate LEF with PERT where mode = E[TEF] * E[Vuln]. Remove `tef`/`vulnerability` from `fairInputs`. |
| Edit TEF or Vulnerability | Recompute Expected LEF display. Mark results as outdated. |

## Styling Notes

- Decomposed section: subtle background (`#f8fafc`), 1px border
- Toggle links: text button style, no border, primary color, 12px
- "TEF x V" canvas indicator: `fontSize: 9`, `color: var(--text-muted)`, `fontStyle: italic`
- All existing design tokens -- no new tokens needed

## Data Model Reference

- `shared/src/index.ts`: `FAIRInputs.tef?: Distribution`, `FAIRInputs.vulnerability?: Distribution`
- Engine: `fairEngine.ts:120-126` already handles TEF x Vuln decomposition
- Spec: `context/analyst/spec-fair-taxonomy.md` (TASK-301, approved)

## Validation States

See wireframes spec 1.1.3 for full table. Key: Vulnerability > 1 should show warning.

## Acceptance Criteria (from spec)

- [ ] UI provides a toggle between direct LEF and decomposed TEF x Vulnerability modes per leaf
- [ ] Canvas displays "TEF x V" on decomposed nodes
- [ ] Expected LEF readout updates live as user edits TEF/Vulnerability
- [ ] Vulnerability inputs constrained to [0, 1] range with validation error
