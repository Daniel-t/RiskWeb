# Attack Tree Canvas Interaction Spec

> Spec produced by @ux for TASK-104. Intended audience: @frontend (TASK-109, TASK-110).

---

## 1. Adding Nodes

### 1a. Drag from Node Palette

| Aspect | Detail |
|--------|--------|
| **Trigger** | User clicks and drags a `PaletteItem` from the left sidebar onto the canvas |
| **Behavior** | A ghost preview of the node follows the cursor. On drop over the canvas area, a new `AttackTreeNode` is created at the drop coordinates. The node receives a generated UUID, default label ("New Leaf", "AND Gate", or "OR Gate"), and the drop position. |
| **Edge cases** | Drop outside the canvas area: no-op (node not created). Drop on top of an existing node: create at that position (nodes can overlap; user repositions manually). |
| **Implementation** | Use React Flow's drag-from-sidebar pattern (`onDragOver`, `onDrop` on the `<ReactFlow>` component with `reactFlowInstance.screenToFlowPosition()`). |

### 1b. Right-Click Context Menu

| Aspect | Detail |
|--------|--------|
| **Trigger** | Right-click on empty canvas area (not on a node or edge) |
| **Menu items** | "Add Leaf Node", "Add AND Gate", "Add OR Gate" |
| **Behavior** | Creates a new node at the right-click position. Menu dismisses on selection or click-away. |
| **Implementation** | Custom context menu component positioned at mouse coordinates. Prevent browser default context menu on canvas. |

### 1c. New Node Defaults

| Node Type | Default Label | Default FAIRInputs |
|-----------|--------------|-------------------|
| Leaf | "New Leaf" | `undefined` (must be filled in by user) |
| AND Gate | "AND Gate" | N/A (gates have no FAIR inputs) |
| OR Gate | "OR Gate" | N/A |

New nodes are **unconnected**. The user must manually create edges to incorporate them into the tree.

---

## 2. Connecting Nodes (Edges)

### 2a. Creating Connections

| Aspect | Detail |
|--------|--------|
| **Trigger** | Drag from a node's **bottom handle** (source) to another node's **top handle** (target) |
| **Direction** | Top-down: parent node is above, child node is below. Source = parent (bottom handle), Target = child (top handle). |
| **Visual feedback** | Ghost edge follows cursor during drag. Valid drop targets highlight with a glow effect. Invalid targets show no highlight. |
| **On success** | New `Edge` created with generated UUID, `sourceId` = parent node, `targetId` = child node. |

### 2b. Connection Validation

Connections are validated **before** creation. Invalid connections are silently rejected (the ghost edge snaps back).

| Rule | Rationale |
|------|-----------|
| No self-loops | A node cannot connect to itself |
| No cycles | Adding this edge must not create a cycle in the graph (would violate DAG requirement) |
| No duplicate edges | Same source-target pair cannot have multiple edges |
| No multiple parents | A node can have at most one incoming edge (one parent). This ensures a tree structure, not a general DAG. |
| Leaf nodes cannot be parents | Leaf nodes have no bottom handle (output). They are always terminal. |

### 2c. Edge Visual Style

| Property | Value |
|----------|-------|
| Stroke color | `#94a3b8` (muted gray) |
| Stroke width | 2px |
| Type | Smoothstep (rounded corners at bends) |
| Animated | No (static in MVP) |
| Arrow | Small arrowhead at target (child) end |
| Selected edge | Stroke color changes to `--primary` (#3b82f6), width 3px |

### 2d. Deleting Edges

| Aspect | Detail |
|--------|--------|
| **Trigger** | Click edge to select, then press Delete key. Or right-click edge > "Delete Connection". |
| **Confirmation** | None required (edge deletion is low-risk and easily undone by reconnecting). |

---

## 3. Selecting Nodes

| Aspect | Detail |
|--------|--------|
| **Trigger** | Single click on a node |
| **Behavior** | Node receives selection styling (see below). `selectedNodeId` in store is set to this node's ID. Right sidebar `PropertyPanel` updates to show this node's details. |
| **Deselect** | Click on empty canvas background. `selectedNodeId` set to `null`. PropertyPanel shows ScenarioInfoPanel. |
| **Multi-select** | Not supported in MVP. Clicking a different node deselects the previous one. |

### Selection Visual Style

| Property | Value |
|----------|-------|
| Border | 2px solid `--primary` (#3b82f6) |
| Box shadow | `0 0 0 3px rgba(59, 130, 246, 0.3)` (blue glow) |
| z-index | Elevated above other nodes |

---

## 4. Moving Nodes

| Aspect | Detail |
|--------|--------|
| **Trigger** | Click and drag a node |
| **Behavior** | Node follows cursor in real-time. Connected edges update dynamically. Position is updated in store on drag end. |
| **Grid snap** | Optional. When enabled, nodes snap to a 20px grid. Toggled via a small grid icon in the canvas toolbar (top-right corner of canvas). Default: off. |
| **Bounds** | No bounds restriction — nodes can be moved anywhere on the infinite canvas. |

---

## 5. Deleting Nodes

### 5a. Trigger

- Select a node, then press the **Delete** or **Backspace** key.
- Or right-click a node > "Delete Node".

### 5b. Behavior Based on Children

| Condition | Behavior |
|-----------|----------|
| **Node has no children** | Delete immediately. Remove node and all connected edges (both incoming and outgoing). |
| **Node has children** | Show confirmation dialog with two options: |
| | **"Delete node and all descendants"** — Recursively removes this node, all descendant nodes, and all related edges. |
| | **"Delete node only"** — Removes only this node and its edges. Children become unconnected (orphaned). |
| | **"Cancel"** — No action. |

### 5c. Post-Deletion

- If the deleted node was selected, selection clears (`selectedNodeId = null`).
- PropertyPanel reverts to ScenarioInfoPanel.
- Validation indicators update (e.g., orphaned nodes may show warnings).

---

## 6. Gate Behavior

### 6a. Visual Distinction

| Gate Type | Shape | Fill Color | Label | Border |
|-----------|-------|------------|-------|--------|
| AND | Rectangle, square corners | `--node-and` (#dbeafe, light blue) | "AND" centered | 1px solid #93c5fd |
| OR | Rectangle, rounded corners (12px radius) | `--node-or` (#ffedd5, light orange) | "OR" centered | 1px solid #fdba74 |

Both gate types are ~120x50px. They display:
- Label text (user-editable name) above the gate type label.
- Gate type indicator ("AND" or "OR") in smaller text below the label.
- Top handle (input from parent) centered at top edge.
- Bottom handle (output to children) centered at bottom edge.

### 6b. Gate Type Toggle

In the `GatePropertyPanel` (right sidebar), a dropdown allows switching between AND and OR. Changing the type:
- Updates `AttackTreeNode.type` from `'and'` to `'or'` or vice versa.
- Re-renders the node with the new visual style (color and shape change).
- Does not affect edges — children remain connected.

---

## 7. Auto-Layout

| Aspect | Detail |
|--------|--------|
| **Trigger** | "Auto Layout" button in the TopBar toolbar |
| **Algorithm** | Dagre layout engine, direction: top-to-bottom (TB) |
| **Behavior** | One-shot repositioning of all nodes. The root appears at top, children fan out below. |
| **Node spacing** | Horizontal: 60px. Vertical: 80px. |
| **After layout** | User can freely drag nodes to adjust. Auto-layout is not a persistent mode. |
| **Edge case** | If there are disconnected subgraphs, each is laid out independently, placed side by side. |

---

## 8. Zoom and Pan

Standard React Flow behavior — no customization needed.

| Action | Input |
|--------|-------|
| Zoom in/out | Mouse wheel scroll |
| Pan | Click and drag on empty canvas background |
| Fit view | Double-click on empty canvas (or a "Fit View" button in canvas toolbar). Zooms to fit all nodes with padding. |
| Zoom limits | Min: 0.25x, Max: 2.0x |

### Canvas Mini-Toolbar

A small floating toolbar in the top-right corner of the canvas panel:

```
+------------------+
| [Fit] [Grid] [+] [-] |
+------------------+
```

| Button | Action |
|--------|--------|
| Fit | Fit all nodes in view |
| Grid | Toggle grid snap (highlighted when on) |
| + | Zoom in |
| - | Zoom out |

---

## 9. Validation Indicators

Visual badges displayed on nodes to communicate validation state.

### 9a. Node-Level Indicators

| Condition | Indicator | Placement |
|-----------|-----------|-----------|
| Leaf missing FAIR inputs (LEF or LM undefined) | Yellow triangle icon with "!" | Top-right corner of node |
| Leaf with incomplete FAIR inputs (invalid params) | Yellow triangle icon with "!" | Top-right corner of node |
| Leaf with complete, valid FAIR inputs | Green circle with checkmark | Top-right corner of node |
| Gate with 0 children | Yellow triangle icon with "!" | Top-right corner of node |
| Gate with 1+ children, all valid | Green circle with checkmark | Top-right corner of node |

Badge size: 18x18px. Offset: -4px from top-right corner (overlapping the node border).

### 9b. Canvas-Level Indicators

| Condition | Indicator |
|-----------|-----------|
| Tree has no nodes | Centered placeholder: "Drag nodes from the palette to start building your attack tree" |
| Tree has nodes but no single root | Warning banner at top of canvas: "No root node detected. Ensure one node has no parent." Background: `--warning` with white text. |
| Multiple disconnected subgraphs | Info banner: "Some nodes are not connected to the main tree." |

### 9c. Run Simulation Button State

The "Run Simulation" button in the TopBar reflects overall validation:
- **Enabled** (primary color): Tree is valid — single root, all leaves have valid FAIR inputs, all gates have children.
- **Disabled** (grayed out): Any validation error exists. Tooltip on hover explains: "Fix validation errors before running simulation."

---

## 10. Custom Node Visual Design

### 10a. Leaf Node

```
+----------------------------------+
|  [!]                             |  <- validation badge (top-right)
|          Phishing Email          |  <- label (centered)
|                                  |
+----------------------------------+
               [o]                    <- bottom handle (source, to parent)
```

| Property | Value |
|----------|-------|
| Dimensions | 160 x 60 px |
| Fill | `--node-leaf` (#ffffff, white) |
| Border | 1px solid #e2e8f0 |
| Border radius | 8px (rounded rectangle) |
| Label | 13px, font-weight 500, centered horizontally and vertically |
| Handles | Bottom center only (source handle, connects to parent's top handle) |
| Selected | Blue border + glow (see Section 3) |

### 10b. AND Gate Node

```
               [o]                    <- top handle (target, from parent)
+---------------------------+
|  [!]                      |
|        Access Gained      |  <- label
|           AND             |  <- gate type indicator
+---------------------------+
               [o]                    <- bottom handle (source, to children)
```

| Property | Value |
|----------|-------|
| Dimensions | 120 x 50 px |
| Fill | `--node-and` (#dbeafe, light blue) |
| Border | 1px solid #93c5fd |
| Border radius | 2px (squared corners) |
| Label | 13px, font-weight 500, centered |
| Type indicator | 11px, font-weight 600, uppercase, color #3b82f6 |
| Handles | Top center (target) + Bottom center (source) |

### 10c. OR Gate Node

```
               [o]                    <- top handle (target, from parent)
+---------------------------+
|  [!]                      |
|       Network Breach      |  <- label
|            OR             |  <- gate type indicator
+---------------------------+
               [o]                    <- bottom handle (source, to children)
```

| Property | Value |
|----------|-------|
| Dimensions | 120 x 50 px |
| Fill | `--node-or` (#ffedd5, light orange) |
| Border | 1px solid #fdba74 |
| Border radius | 12px (rounded) |
| Label | 13px, font-weight 500, centered |
| Type indicator | 11px, font-weight 600, uppercase, color #ea580c |
| Handles | Top center (target) + Bottom center (source) |

### 10d. Handle Styling

| Property | Value |
|----------|-------|
| Size | 10 x 10 px |
| Shape | Circle |
| Color (idle) | `#94a3b8` |
| Color (hover/connecting) | `--primary` (#3b82f6) |
| Border | 2px solid white |

---

## 11. Right-Click Context Menus

### 11a. Canvas Background Context Menu

| Menu Item | Action |
|-----------|--------|
| Add Leaf Node | Creates leaf at click position |
| Add AND Gate | Creates AND gate at click position |
| Add OR Gate | Creates OR gate at click position |

### 11b. Node Context Menu

| Menu Item | Action |
|-----------|--------|
| Delete Node | Triggers delete flow (Section 5) |
| Duplicate Node | Creates a copy of the node offset 40px right and 40px down. No edges copied. |

### 11c. Edge Context Menu

| Menu Item | Action |
|-----------|--------|
| Delete Connection | Removes the edge |

### Menu Styling

- Background: white, border-radius 6px, box-shadow for elevation.
- Items: 14px text, 8px vertical padding, hover highlight `#f1f5f9`.
- Dismiss on: click outside, press Escape, or select an item.

---

## 12. Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| Delete / Backspace | Delete selected node or edge | Node or edge selected |
| Escape | Deselect current selection | Any selection active |
| Ctrl+Z | Undo (future, not in MVP) | — |
| Ctrl+Y | Redo (future, not in MVP) | — |

MVP scope includes Delete/Backspace and Escape only. Undo/redo listed for future reference.

---

## 13. Edge Cases & Error States

| Scenario | Behavior |
|----------|----------|
| User drags palette item but drops outside canvas | No-op. Ghost preview disappears. |
| User tries to connect leaf's non-existent bottom handle to another node | Not possible — leaf nodes only have a bottom handle (they are sources/children, not parents). Wait — correction: in a top-down tree, **parents are above and children below**. Parent connects via bottom handle (source) to child's top handle (target). Leaf nodes are children (have top handle as target) but cannot be parents (no bottom source handle). So if user tries to drag from a leaf's position where no handle exists, nothing happens. |
| User deletes the root node | Tree becomes rootless. Canvas shows warning banner (Section 9b). |
| Simulation running while user edits tree | Editing is allowed during simulation. Results will be based on the state when simulation started. A "Results outdated" indicator appears if tree changes after last simulation. |
| Very large trees (50+ nodes) | React Flow handles this natively. Performance should remain acceptable. No pagination or virtualization needed in MVP. |
