---
id: TASK-103
title: MVP UI Layout & Component Wireframes
status: done
priority: high
assigned: ux
reviewers: []
depends_on: []
modifies: [context/ux/spec-mvp-layout.md]
created: 2026-05-14
---

# TASK-103: MVP UI Layout & Component Wireframes

## Objective
Design the MVP application layout and define the component hierarchy. Produce wireframes and specs -- no code.

## Deliverables

Write `context/ux/spec-mvp-layout.md` covering:

### App Shell
- Top nav bar: app title ("RiskWeb"), editable scenario name, toolbar buttons (New, Save, Load, Run Simulation)
- Main content area below nav bar

### Three-Panel Layout
- **Left sidebar** (~240px): Node palette with draggable node types (Leaf, AND Gate, OR Gate). Optional tree outline below palette.
- **Center panel** (flex): React Flow canvas for attack tree
- **Right sidebar** (~320px): Property panel for selected node (FAIR inputs for leaves, gate config for gates, scenario info when nothing selected)

### Results Panel
- Bottom drawer, collapsed by default
- Expands when simulation results are available (or via toggle)
- Contains: summary stats table (Mean, P10, P50, P90, StdDev) + ALE histogram

### Toolbar Behavior
- **New**: resets to empty scenario (confirm if unsaved changes)
- **Save**: saves current state to backend
- **Load**: opens modal dialog listing saved scenarios
- **Run Simulation**: triggers Monte Carlo run, shows progress bar, disabled when inputs incomplete

### Component Hierarchy
List each React component with its responsibility, props summary, and parent:
- `AppShell` > `TopBar`, `MainContent`
- `MainContent` > `LeftSidebar`, `CanvasPanel`, `RightSidebar`, `ResultsDrawer`
- `LeftSidebar` > `NodePalette`
- `CanvasPanel` > `AttackTreeCanvas`
- `RightSidebar` > `PropertyPanel`
- `ResultsDrawer` > `ResultsSummary`, `ALEHistogram`

### Responsive Notes
- Desktop only, minimum 1280px width
- Sidebars collapsible via toggle for more canvas space

## Acceptance Criteria
- Wireframes cover all MVP user flows (build tree, enter inputs, run sim, view results, save/load)
- Component list detailed enough for @frontend to implement without ambiguity
- Human reviews and approves
