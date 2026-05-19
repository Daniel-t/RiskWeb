---
id: TASK-204
title: "Control UI Interaction Design & Wireframes"
status: done
priority: high
assigned: ux
reviewers: [analyst, frontend]
depends_on: [TASK-203]
modifies: context/ux/spec-control-ui.md
---

# TASK-204: Control UI Interaction Design & Wireframes

## Objective
Design the UI/UX for browsing, creating, assigning, and visualizing security controls within RiskWeb.

## Key Interactions to Design

### 1. Control Library Panel
- Browse/search existing controls in the library
- Create new custom controls (name, category, effectiveness distribution)
- Edit/delete controls

### 2. Control Assignment to Nodes
- How users assign controls from the library to leaf nodes
- Drag-and-drop vs. selection panel approach
- Visual feedback during assignment

### 3. Control Badges on Leaf Nodes
- How assigned controls appear on the canvas (badges, icons, count indicators)
- Hover/click behavior to see control details

### 4. Node Control Panel (in PropertyPanel)
- When a leaf node is selected, show its assigned controls
- Allow removing or reordering controls
- Show combined effectiveness preview

### 5. ATT&CK/D3FEND Catalog Browser
- Browse techniques and suggested defenses
- One-click to create a control from a D3FEND mapping

### 6. Baseline vs. Controlled Comparison
- How to display before/after simulation results when controls are applied

## Design Constraints
- Must fit within existing layout (left sidebar, center canvas, right property panel)
- Control library likely lives in left sidebar as a new tab/section
- Refer to TASK-103 MVP layout spec for existing structure
- Controls apply to **leaf nodes only** (per TASK-203 spec)
- Effectiveness uses Distribution (PERT/triangular) — needs appropriate input widgets

## Deliverable
A wireframe spec document at `context/ux/spec-control-ui.md` with:
- ASCII or descriptive wireframes for each interaction
- Component hierarchy
- State descriptions (empty, populated, editing)
- Responsive considerations

## References
- TASK-203 (approved): Control impact semantics — especially Section 2 (effectiveness) and Section 3 (multiple controls stacking)
- TASK-205 (approved): Type definitions (Control, ControlAssignment, ControlCategory)
- TASK-103: MVP layout wireframes (existing reference)
- `context/ux/spec-mvp-layout.md`: Current layout spec
