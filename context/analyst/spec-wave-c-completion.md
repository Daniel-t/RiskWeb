# Wave C Completion Specification

**Author**: @analyst
**Date**: 2026-05-19
**Status**: draft
**Depends on**: TASK-203 (approved), TASK-205 (approved), TASK-204 (done)

## Overview

Wave C delivers the controls feature end-to-end: control CRUD, assignment to leaf nodes, simulation impact, and results comparison. This spec consolidates requirements from TASK-203 (control impact), TASK-205 (shared types), and TASK-204 (UI design) into actionable implementation tasks.

## Implementation Status Assessment

Most Wave C code exists in the working directory (uncommitted). This spec identifies the **current state** and **remaining gaps** for each task.

---

## TASK-212: Control Zustand Store + IndexedDB Storage

**Status**: Implemented (needs validation)
**Assigned**: @frontend
**Reviewers**: @secarch, @analyst, @test
**Depends on**: TASK-206, TASK-204
**Modifies**: `frontend/src/store/controlStore.ts`, `frontend/src/services/storage.ts`, `frontend/src/services/api.ts`

### Requirements
1. `useControlStore` Zustand store with CRUD methods for controls and assignments
2. IndexedDB `controls` object store via StoragePort
3. API service delegates control CRUD to storage layer
4. Assignment methods: add, remove, toggle enabled, update override
5. `getNodeAssignments(nodeId)` helper

### Acceptance Criteria
- [ ] Controls persist across page reloads (IndexedDB)
- [ ] Creating a control with duplicate name shows validation error
- [ ] Deleting a control removes all its assignments
- [ ] Toggling an assignment updates `enabled` flag and triggers re-render
- [ ] `getNodeAssignments` returns only assignments for the specified node
- [ ] Store resets cleanly when switching scenarios

### Current State
Fully implemented in `controlStore.ts`, `storage.ts`, `api.ts`. Needs test coverage and validation against acceptance criteria.

---

## TASK-213: Control Library Browser Panel

**Status**: Implemented (needs validation)
**Assigned**: @frontend
**Reviewers**: @ux, @secarch, @test
**Depends on**: TASK-212
**Modifies**: `frontend/src/components/Controls/ControlLibraryPanel.tsx`, `frontend/src/components/Controls/ControlCard.tsx`, `frontend/src/components/Layout/Sidebar.tsx`

### Requirements
1. Left sidebar tab system: "Nodes" | "Controls" (per TASK-204 spec)
2. Control library panel with search input (debounced) and category filter dropdown
3. Controls grouped by category (Preventive, Detective, Corrective) with collapsible sections
4. Each control rendered as a draggable card with category badge, name, and technique ID
5. "+ New" button opens create modal; "Catalog" button opens catalog browser

### Acceptance Criteria
- [ ] Tab switching toggles between node palette and control library
- [ ] Search filters controls by name (case-insensitive, debounced 200ms)
- [ ] Category filter restricts displayed controls
- [ ] Empty state shows "No controls yet" message with prompt to create
- [ ] Control cards are draggable (set `dataTransfer` with control ID)

### Current State
Fully implemented: `LeftSidebarTabs.tsx`, `ControlLibraryPanel.tsx`, `ControlCard.tsx`. Needs visual QA against UX spec.

---

## TASK-214: ATT&CK/D3FEND Catalog Browser (Client-Side)

**Status**: Implemented (needs validation)
**Assigned**: @frontend
**Reviewers**: @threat, @secarch, @test
**Depends on**: TASK-212
**Modifies**: `frontend/src/components/Controls/CatalogBrowserModal.tsx`, `frontend/src/services/catalog.ts`

### Requirements
1. Modal with two-pane layout: technique list (left) + details (right)
2. Search by technique name/ID, filter by tactic
3. Selected technique shows description, subtechniques, and D3FEND countermeasures
4. Each countermeasure shows suggested LEF reduction distribution
5. "Create Control" button per countermeasure prefills ControlFormModal with mapped data
6. Catalog service loads from bundled static JSON (`shared/data/`)

### Acceptance Criteria
- [ ] All techniques from `attack-catalog.json` are listed and searchable
- [ ] Selecting a technique shows its D3FEND countermeasures from `d3fend-mappings.json`
- [ ] "Create Control" prefills: name, category (from D3FEND category mapping), LEF reduction, ATT&CK IDs, D3FEND IDs
- [ ] Modal closes on escape or backdrop click
- [ ] Performance: renders smoothly with full catalog (~50+ techniques)

### Current State
Fully implemented: `CatalogBrowserModal.tsx`, `catalog.ts`. Needs testing with full dataset.

---

## TASK-215: Control-to-Node Assignment Interaction

**Status**: Partially implemented (picker only, no drag-drop)
**Assigned**: @frontend
**Reviewers**: @ux, @secarch, @test
**Depends on**: TASK-213
**Modifies**: `frontend/src/components/Controls/ControlPickerPopover.tsx`, `frontend/src/components/Canvas/AttackTreeCanvas.tsx`, `frontend/src/components/Canvas/nodes/LeafNode.tsx`

### Requirements
1. **Picker method** (implemented): "Add Control" button in NodeControlsSection opens popover listing unassigned controls; single-click assigns
2. **Drag-drop method** (not implemented): Drag control card from sidebar onto leaf node on canvas
   - Canvas detects drop on leaf nodes only (not gates)
   - Ghost card feedback during drag
   - Duplicate assignment prevented with toast notification
   - Drop on non-leaf or empty canvas is a no-op

### Acceptance Criteria
- [ ] Picker: clicking a control in popover creates assignment and closes popover
- [ ] Picker: already-assigned controls shown grayed with "Assigned" label
- [ ] Drag-drop: dragging a control card onto a leaf node creates an assignment
- [ ] Drag-drop: visual feedback on valid drop targets (leaf node highlight)
- [ ] Drag-drop: dropping on gate node or empty canvas does nothing
- [ ] Duplicate assignment attempt shows toast "Control already assigned to this node"
- [ ] Assignment immediately reflected in NodeControlsSection and leaf badge

### Current State
Picker implemented (`ControlPickerPopover.tsx`). Drag-drop from sidebar to canvas **not implemented** — control cards set `dataTransfer` but canvas has no drop handler.

### Gap Work Required
- Add `onDrop`/`onDragOver` handlers to `AttackTreeCanvas.tsx` or leaf nodes
- Implement drop target highlighting on leaf nodes during drag
- Add toast notification for duplicate assignment
- Test both assignment methods

---

## TASK-216: Visual Control Badges on Leaf Nodes

**Status**: Mostly implemented (minor gaps)
**Assigned**: @frontend
**Reviewers**: @ux, @test
**Depends on**: TASK-215
**Modifies**: `frontend/src/components/Canvas/nodes/LeafNode.tsx`

### Requirements (per TASK-204 UX spec)
1. Shield icon + count badge on leaf nodes that have assignments
2. If some assignments disabled: show "enabled/total" (e.g., "1/3")
3. Category color logic: all same category -> that category's color; mixed -> gray
4. Hover tooltip popover listing assigned controls with effectiveness and enabled status

### Acceptance Criteria
- [ ] Badge appears when node has >= 1 assignment
- [ ] Badge shows correct enabled/total count
- [ ] Badge color: blue (preventive), amber (detective), green (corrective), gray (mixed)
- [ ] Hover tooltip lists each control with name, category, effectiveness percentage, enabled/disabled
- [ ] Badge hidden when all assignments removed

### Current State
Badge renders with shield icon and count. Shows enabled/total when some disabled. **Gaps**: always blue (no mixed-category logic), title attribute only (no hover tooltip popover).

### Gap Work Required
- Implement category color logic (inspect all assignments, determine if uniform or mixed)
- Replace title attribute with hover popover (per UX spec)

---

## TASK-217: Node Controls Panel in PropertyPanel

**Status**: Mostly implemented (override UI missing)
**Assigned**: @frontend
**Reviewers**: @ux, @analyst, @test
**Depends on**: TASK-215
**Modifies**: `frontend/src/components/PropertyPanel/NodeControlsSection.tsx`

### Requirements (per TASK-203 and TASK-204)
1. Section in right-side property panel showing controls assigned to selected leaf node
2. Each assignment row: enabled checkbox, category badge, control name, effectiveness summary, remove button
3. **Override expander**: chevron toggles inline section with `lefReductionOverride` and optional `lmReductionOverride` distribution inputs
4. "Reset to default" link clears overrides back to control's base values
5. Combined reduction progress bar showing aggregate effectiveness
6. Warning if combined reduction > 99% (diminishing returns)
7. "+ Add Control" button opens ControlPickerPopover
8. Empty state: "No controls assigned" message

### Acceptance Criteria
- [ ] Assignment rows render with correct data from controlStore
- [ ] Toggle enabled/disabled updates assignment and triggers simulation recalc
- [ ] Remove button removes assignment with confirmation (if more than one)
- [ ] Override expander shows distribution inputs for LEF and LM reduction
- [ ] Overridden values are saved to assignment and used in simulation
- [ ] "Reset to default" clears override fields
- [ ] Combined bar shows correct aggregate reduction percentage
- [ ] Bar turns warning color (amber/red) when > 99%

### Current State
Assignment rows, toggle, remove, combined bar all implemented. **Gap**: override expander UI not implemented — no chevron, no distribution inputs for per-assignment tuning.

### Gap Work Required
- Add collapsible override section per assignment row
- Reuse distribution input component from FAIR inputs panel
- Wire override values to `controlStore.updateAssignmentOverride()`
- Add "Reset to default" action

---

## TASK-218: Update Simulation Engine for Control Reductions

**Status**: Implemented (needs validation)
**Assigned**: @frontend
**Reviewers**: @analyst, @secarch, @test
**Depends on**: TASK-203, TASK-206, TASK-215
**Modifies**: `frontend/src/workers/fairEngine.ts`, `frontend/src/workers/simulation.worker.ts`

### Requirements (per TASK-203 spec)
1. Per iteration, for each leaf node with control assignments:
   - For each enabled assignment, sample from control's `lefReduction` distribution (or override if set)
   - Compute `passThrough = 1 - sampledReduction` per control
   - Combined `passThrough = product(all passThroughs)`, clamped to [0, 1]
   - `effective_lef = base_lef * combined_passThrough`
2. LM reduction (if control has `lmReduction`):
   - Same multiplicative stacking logic
   - Applied to scenario-level LM before ALE calculation
3. Disabled assignments (enabled=false) are skipped
4. Orphaned assignments (control ID not found in control map) generate warnings in `SimulationResult.controlWarnings`

### Acceptance Criteria
- [ ] Single control with 80% LEF reduction reduces mean ALE by ~80%
- [ ] Two controls at 50% each produce ~75% combined reduction (multiplicative: 0.5 * 0.5 = 0.25 passthrough)
- [ ] Disabled controls have zero effect on simulation output
- [ ] Override values take precedence over control base values
- [ ] Orphaned assignments produce warning messages in result
- [ ] LM reduction applied correctly to scenario-level loss magnitude
- [ ] Results are reproducible with same random seed

### Current State
LEF reduction with multiplicative stacking implemented in `fairEngine.ts`. Worker builds control/assignment maps and generates orphan warnings. **LM reduction path needs verification** — infrastructure present but final calculation not confirmed in code review.

### Validation Required
- Unit test: single control reduction
- Unit test: multiplicative stacking (2+ controls)
- Unit test: disabled control no-op
- Unit test: override precedence
- Integration test: full simulation with controls vs. without

---

## TASK-219: Control CRUD UI (Create/Edit/Delete)

**Status**: Implemented (needs validation)
**Assigned**: @frontend
**Reviewers**: @ux, @secarch, @test
**Depends on**: TASK-213
**Modifies**: `frontend/src/components/Controls/ControlFormModal.tsx`

### Requirements
1. Modal form with fields: name, description, category, LEF reduction distribution, LM reduction (optional toggle + distribution), ATT&CK technique IDs, D3FEND technique IDs
2. Create mode: blank form, "Create" button
3. Edit mode: prefilled form, "Update" button
4. Delete: confirmation dialog, cascades to remove all assignments referencing this control
5. Validation: name required (max 200 chars), description max 2000 chars, technique IDs match regex patterns

### Acceptance Criteria
- [ ] Create: new control appears in library panel immediately
- [ ] Edit: changes reflected in library panel and all assignment views
- [ ] Delete: control removed, all assignments referencing it removed, confirmation required
- [ ] Validation errors shown inline next to fields
- [ ] ATT&CK ID format enforced: `T\d{4}(\.\d{3})?`
- [ ] D3FEND ID format enforced: `D3-[A-Z]{2,5}`
- [ ] Modal closes on save/cancel/escape

### Current State
Fully implemented: `ControlFormModal.tsx` with all fields, validation, create/edit/delete modes.

---

## Wave D Tasks (Integration & Validation)

### TASK-220: Save/Load with controlAssignments
**Depends on**: TASK-218
- Scenario JSON export must include `controlAssignments[]` array
- Import must validate assignments against available controls
- Orphaned assignments (control not found) should be preserved but flagged

### TASK-221: Baseline vs. Controlled ALE Comparison View
**Depends on**: TASK-218
- Toggle in results panel: "Baseline | With Controls"
- Baseline mode: run simulation ignoring all controls
- Overlay histogram: gray = baseline distribution, blue = controlled distribution
- Summary stats for both (mean, P5, P50, P95) in side-by-side table
- Delta row showing reduction percentage

### TASK-222: End-to-End Validation (Controls Impact Correctness)
**Assigned**: @analyst
**Depends on**: TASK-218, TASK-220
- Verify simulation output matches hand-calculated expected values
- Test scenarios: no controls, single control, multiple controls, disabled controls, overrides
- Validate ALE reduction percentages match spec formulas

### TASK-223: Security Review (Phase 2 Frontend + Storage)
**Assigned**: @secarch
**Depends on**: TASK-212..TASK-221
- Review IndexedDB storage for injection risks
- Validate JSON import/export sanitization
- Check control form inputs for XSS vectors
- Review Web Worker message passing security

---

## Summary of Remaining Work

### High Priority (Functional Gaps)
| Gap | Task | Effort |
|-----|------|--------|
| Drag-drop assignment (sidebar to canvas) | TASK-215 | Medium |
| Override UI in NodeControlsSection | TASK-217 | Medium |
| LM reduction verification in simulation | TASK-218 | Low |
| Baseline vs. controlled comparison view | TASK-221 | Medium |

### Medium Priority (Polish)
| Gap | Task | Effort |
|-----|------|--------|
| Badge category color logic (mixed = gray) | TASK-216 | Low |
| Badge hover tooltip popover | TASK-216 | Low |
| Duplicate assignment toast notification | TASK-215 | Low |

### Validation Required (All Tasks)
- Unit tests for controlStore operations
- Unit tests for simulation engine with controls
- Visual QA against UX spec
- E2E test: create control -> assign -> simulate -> verify reduction
