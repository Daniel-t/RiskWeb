---
id: TASK-104
title: Attack Tree Canvas Interaction Spec
status: done
priority: high
assigned: ux
reviewers: []
depends_on: []
modifies: [context/ux/spec-attack-tree-interactions.md]
created: 2026-05-14
---

# TASK-104: Attack Tree Canvas Interaction Spec

## Objective
Define all user interactions on the attack tree canvas. Produce interaction specs -- no code.

## Deliverables

Write `context/ux/spec-attack-tree-interactions.md` covering:

### Adding Nodes
- Drag from node palette onto canvas to create a new node at drop position
- Right-click context menu on canvas background: "Add Leaf Node", "Add AND Gate", "Add OR Gate"
- New nodes appear unconnected; user must manually connect them

### Connecting Nodes
- Drag from a source node's bottom handle to a target node's top handle
- Connections flow top-down (parent above, children below)
- Validation: reject cycles, reject connections that would create multiple roots
- Visual feedback during drag (ghost edge)

### Selecting Nodes
- Click node to select; selection highlights with border/glow
- Selected node's details appear in right sidebar property panel
- Click canvas background to deselect
- Single selection only (no multi-select in MVP)

### Moving Nodes
- Drag to reposition in free-form mode
- Snapping: optional grid snap (can be toggled)

### Deleting Nodes
- Select node, press Delete key (or right-click > "Delete")
- If node has children: confirmation dialog -- "Delete node and all children?" or "Delete node only (children become unconnected)?"
- Deleting a node also removes all connected edges

### Gate Behavior
- AND gates: rectangular shape with "&" or "AND" label, distinct color (e.g., blue)
- OR gates: diamond or rounded shape with "|" or "OR" label, distinct color (e.g., orange)
- Gate type toggleable in property panel (AND <-> OR)

### Auto-Layout
- Button in toolbar: "Auto Layout"
- Applies dagre top-down tree layout algorithm as a one-shot reformat
- Does NOT persist as a mode -- user can manually move nodes afterward

### Zoom and Pan
- Mouse wheel to zoom, click-drag on background to pan
- Standard React Flow behavior, no customization needed

### Validation Indicators
- Leaf nodes missing FAIR inputs: warning badge (yellow triangle icon) on node
- Leaf nodes with complete FAIR inputs: checkmark or green indicator
- Gate nodes with no children: warning badge
- Tree with no root: warning message on canvas

### Custom Node Visual Design
- **Leaf node**: rounded rectangle, white/light fill, label centered, bottom handle (output to parent). ~160x60px.
- **AND gate**: rectangle with squared corners, light blue fill, "AND" label, top handle (input from parent) + bottom handle (output to children). ~120x50px.
- **OR gate**: rectangle with rounded corners, light orange fill, "OR" label, same handles. ~120x50px.
- All nodes show label text, node type icon in corner, and validation badge if applicable.

## Acceptance Criteria
- Every interaction is specified unambiguously (trigger, behavior, edge cases)
- Visual specs sufficient for @frontend to implement custom React Flow nodes
- Human reviews and approves
