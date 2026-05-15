# MVP UI Layout & Component Wireframes

> Spec produced by @ux for TASK-103. Intended audience: @frontend (TASK-108, TASK-110, TASK-113).

---

## 1. App Shell

The application is a single-page app with a fixed top bar and a flexible main content area below.

```
+---------------------------------------------------------------+
| TopBar                                                        |
+---------------------------------------------------------------+
| MainContent                                                   |
|                                                               |
|                                                               |
+---------------------------------------------------------------+
```

- **Minimum viewport**: 1280 x 720 px (desktop only, no mobile/tablet support in MVP).
- The TopBar is fixed height (48px). MainContent fills the remaining viewport height (`calc(100vh - 48px)`).

---

## 2. TopBar

```
+---------------------------------------------------------------+
| [RiskWeb]  | Scenario: [______________] | [New][Save][Load][Run Simulation] |
+---------------------------------------------------------------+
```

| Element | Behavior |
|---------|----------|
| **App title** | Static text "RiskWeb", left-aligned. Clickable (no-op in MVP, future: navigate to dashboard). |
| **Scenario name** | Inline-editable text input. Defaults to "Untitled Scenario". Blur or Enter commits the rename. Stored as `Scenario.name`. |
| **New** | Resets to empty scenario. If current scenario has unsaved changes, show confirmation dialog: "You have unsaved changes. Discard and create new scenario?" with Cancel / Discard buttons. |
| **Save** | POST/PUT current scenario to backend (`/api/scenarios`). Show brief toast "Scenario saved" on success. Disabled if scenario is empty (no nodes). |
| **Load** | Opens `LoadScenarioModal` (see Section 6). |
| **Run Simulation** | Triggers Monte Carlo simulation via `useSimulation` hook. Disabled when: (a) no nodes exist, (b) any leaf is missing FAIR inputs, (c) tree has no single root, (d) simulation already running. While running, button shows "Running..." with a spinner and a progress bar appears below the TopBar. |

### Progress Bar

When simulation is running, a thin (4px) progress bar appears directly below the TopBar, spanning full width. Color: primary blue. Updates via `progress` messages from the Web Worker.

```
+---------------------------------------------------------------+
| TopBar                                                        |
|=======================================                        | <- progress bar (60%)
+---------------------------------------------------------------+
```

---

## 3. Three-Panel Layout

MainContent uses a horizontal flexbox with three panels.

```
+----------+-----------------------------+-----------+
| Left     |         Center              |   Right   |
| Sidebar  |         Canvas              |  Sidebar  |
| 240px    |         (flex: 1)           |   320px   |
|          |                             |           |
|          |                             |           |
|          |                             |           |
|          |                             |           |
+----------+-----------------------------+-----------+
```

### Sidebar Collapse

Each sidebar has a collapse toggle button at its inner edge (a small chevron icon):
- Left sidebar: `<<` button at its right edge to collapse, `>>` to expand.
- Right sidebar: `>>` button at its left edge to collapse, `<<` to expand.
- When collapsed, sidebar width becomes 0 and the center canvas expands to fill the space.
- Collapse state is local (not persisted to scenario).

---

## 4. Left Sidebar — Node Palette

```
+-------------------+
| NODE PALETTE      |
+-------------------+
| +---------------+ |
| | [leaf] Leaf   | |  <- draggable
| +---------------+ |
| +---------------+ |
| | [AND] AND Gate| |  <- draggable
| +---------------+ |
| +---------------+ |
| | [OR]  OR Gate | |  <- draggable
| +---------------+ |
+-------------------+
```

- **Width**: 240px fixed (when expanded).
- **Header**: "Node Palette" label, 12px uppercase, muted color.
- **Palette items**: Three draggable cards, one per node type:
  - **Leaf Node**: Rounded rectangle icon, label "Leaf Node".
  - **AND Gate**: Rectangle icon with "&", label "AND Gate".
  - **OR Gate**: Rounded rectangle icon with "|", label "OR Gate".
- Each card has a subtle border, 8px padding, and a grab cursor on hover.
- Drag-and-drop uses React DnD or React Flow's built-in drag-from-sidebar pattern. On drop over the canvas, a new node is created at the drop position.

### Tree Outline (optional, future)

Below the palette, space is reserved for a tree outline view showing the node hierarchy as a nested list. Not implemented in MVP — the area is simply empty.

---

## 5. Center Panel — Attack Tree Canvas

```
+------------------------------------------+
|                                          |
|      [Leaf: Phishing]                    |
|           |                              |
|      [OR Gate]                           |
|       /      \                           |
| [Leaf: Email] [Leaf: SMS]               |
|                                          |
|                                          |
+------------------------------------------+
```

- **Component**: `AttackTreeCanvas` wrapping `<ReactFlow>` from `@xyflow/react`.
- Fills all available horizontal space (flex: 1) and full height of MainContent.
- Background: light gray (#f8f9fa) with subtle dot grid pattern.
- When empty, shows centered placeholder text: "Drag nodes from the palette to start building your attack tree" in muted gray.
- Interaction details are defined in [spec-attack-tree-interactions.md](spec-attack-tree-interactions.md) (TASK-104).

---

## 6. Right Sidebar — Property Panel

Width: 320px fixed (when expanded). Scrollable if content overflows vertically.

The property panel content changes based on selection state:

### 6a. Nothing Selected — Scenario Info

```
+---------------------+
| SCENARIO INFO       |
+---------------------+
| Name: [___________] |
| Description:        |
| [________________]  |
| [________________]  |
|                     |
| -- LM ($/event) ---|
| Distribution: [PERT]|
| Min:  [10000]       |
| Mode: [50000]       |
| Max:  [200000]      |
|                     |
| Simulation Config   |
| Iterations: [10000] |
| Seed: [___]         |
|                     |
| Nodes: 5            |
| Edges: 4            |
| Validation: 2 warns |
+---------------------+
```

- Editable scenario `name` and `description` fields.
- **Loss Magnitude**: Scenario-level LM distribution input (type selector + params). This is the cost per event when the root scenario materializes, regardless of which attack path caused it. Same distribution input component as used for LEF on leaves.
- `SimulationConfig` controls: `iterations` (number input, default 10000, range 1–1,000,000), `seed` (optional number input).
- Read-only stats: node count, edge count, validation warning count.

### 6b. Leaf Node Selected — FAIR Inputs

```
+---------------------+
| LEAF: Phishing      |
+---------------------+
| Label: [Phishing__] |
|                     |
| -- LEF (events/yr) -|
| Distribution: [PERT]|
| Min:  [0.5]         |
| Mode: [1.0]         |
| Max:  [3.0]         |
|                     |
| [Validation: OK]    |
+---------------------+
```

- **Label**: Editable text input for `AttackTreeNode.label`.
- **LEF section**: Loss Event Frequency (frequency only — LM is defined at scenario level, not per-leaf).
  - Distribution type selector (dropdown): PERT | Lognormal | Constant.
  - Parameter fields change based on type:
    - PERT: Min, Mode, Max (number inputs).
    - Lognormal: Mu, Sigma (number inputs).
    - Constant: Value (number input).
  - Inline validation: red border + error message if params invalid (e.g., min > mode).
- **Validation status**: Green checkmark if LEF is fully specified and valid. Yellow warning otherwise.

### 6c. Gate Node Selected — Gate Config

```
+---------------------+
| GATE: Access Gained |
+---------------------+
| Label: [Access ____]|
|                     |
| Type: [AND v]       |  <- dropdown: AND / OR
|                     |
| Children: 3         |
| Validation: OK      |
+---------------------+
```

- **Label**: Editable.
- **Type**: Dropdown to toggle between AND and OR. Changing type updates `AttackTreeNode.type` and re-renders the node on canvas with appropriate visual style.
- **Children count**: Read-only.
- **Validation**: Warning if gate has 0 children.

---

## 7. Results Drawer

A bottom drawer panel that slides up from the bottom of MainContent, overlaying the lower portion of the canvas.

### Collapsed State (default)

```
+----------+-----------------------------+-----------+
| Left     |         Canvas              |   Right   |
|          |                             |           |
|          |                             |           |
+----------+-----------------------------+-----------+
| [v Results]                                        | <- collapse toggle, 32px bar
+----------------------------------------------------+
```

- A thin bar (32px) at the bottom with a toggle button: "Results" label + chevron.
- Chevron points up (^) to expand.
- If no simulation results exist, the bar shows "Results" grayed out.
- If results exist, the bar shows "Results (last run: Xms)" in normal color.

### Expanded State

```
+----------+-----------------------------+-----------+
| Left     |         Canvas              |   Right   |
|          |                             |           |
+----------+-----------------------------+-----------+
| [^ Results]                            | height:   |
| +------------------+  +-------------+ | ~300px    |
| | Summary Stats    |  | Histogram   | |           |
| | Mean:   $125,000 |  | ▁▂▃▅▇▅▃▂▁  | |           |
| | StdDev: $89,000  |  |             | |           |
| | P10:    $22,000  |  |  ALE ($)    | |           |
| | P50:    $98,000  |  |             | |           |
| | P90:    $310,000 |  +-------------+ |           |
| +------------------+                   |           |
+----------------------------------------+-----------+
```

- **Height**: 300px when expanded. The canvas area above shrinks accordingly.
- **Layout**: Two-column inside the drawer.
  - **Left column** (~40%): `ResultsSummary` — table showing Mean, StdDev, and percentile values from `SimulationResult.summary`. Values formatted as currency (USD).
  - **Right column** (~60%): `ALEHistogram` — D3-rendered histogram of ALE distribution. X-axis: ALE in dollars. Y-axis: frequency count. 30 bins. Vertical lines for P10, P50, P90.
- Chevron points down (v) to collapse.
- Drawer spans full width (under all three panels including sidebars).

---

## 8. Load Scenario Modal

Triggered by the "Load" toolbar button.

```
+------------------------------------------+
|          Load Scenario              [X]  |
+------------------------------------------+
|  Search: [_________________]             |
|                                          |
|  +------------------------------------+ |
|  | Scenario Name     | Last Modified  | |
|  |------------------------------------|  |
|  | Phishing Risk 2026| 2026-05-14     | |
|  | Insider Threat    | 2026-05-12     | |
|  | Supply Chain      | 2026-05-10     | |
|  +------------------------------------+ |
|                                          |
|  [Cancel]                   [Load]       |
+------------------------------------------+
```

- **Overlay**: Centered modal with backdrop dimming.
- **List**: Fetched from `GET /api/scenarios` (returns `ScenarioMeta[]`). Sorted by `modified` descending.
- **Search**: Client-side filter by scenario name.
- **Selection**: Click a row to highlight. "Load" button enabled only when a row is selected.
- **Load action**: Fetches full scenario from `GET /api/scenarios/:id`, replaces current state. If unsaved changes exist, confirm first.
- **Delete**: Each row has a trash icon. Click shows confirmation: "Delete scenario '{name}'?" with Cancel / Delete. Calls `DELETE /api/scenarios/:id`.

---

## 9. Component Hierarchy

```
AppShell
  TopBar
    AppTitle
    ScenarioNameInput
    ToolbarButtons (New, Save, Load, RunSimulation)
    SimulationProgressBar
  MainContent
    LeftSidebar
      SidebarCollapseToggle
      NodePalette
        PaletteItem (x3: Leaf, AND, OR)
    CanvasPanel
      AttackTreeCanvas (wraps ReactFlow)
        LeafNode (custom node)
        AndGateNode (custom node)
        OrGateNode (custom node)
    RightSidebar
      SidebarCollapseToggle
      PropertyPanel
        ScenarioInfoPanel (when nothing selected)
        LeafPropertyPanel (when leaf selected)
        GatePropertyPanel (when gate selected)
    ResultsDrawer
      ResultsToggleBar
      ResultsSummary
      ALEHistogram
  LoadScenarioModal
  ConfirmationDialog (reusable)
```

### Component Details

| Component | Parent | Responsibility | Key Props / State |
|-----------|--------|---------------|-------------------|
| `AppShell` | root | Top-level layout container | — |
| `TopBar` | AppShell | Fixed 48px header bar | — |
| `AppTitle` | TopBar | Static "RiskWeb" text | — |
| `ScenarioNameInput` | TopBar | Inline-editable scenario name | `value: string`, `onChange` |
| `ToolbarButtons` | TopBar | Action buttons group | `onNew`, `onSave`, `onLoad`, `onRun`, `canRun: boolean`, `isRunning: boolean` |
| `SimulationProgressBar` | TopBar | Thin progress bar below TopBar | `progress: number` (0-100), `visible: boolean` |
| `MainContent` | AppShell | Horizontal flex container for panels | — |
| `LeftSidebar` | MainContent | 240px collapsible left panel | `collapsed: boolean` |
| `SidebarCollapseToggle` | LeftSidebar / RightSidebar | Chevron button to collapse/expand | `collapsed: boolean`, `onToggle` |
| `NodePalette` | LeftSidebar | Container for draggable node types | — |
| `PaletteItem` | NodePalette | Single draggable node type card | `nodeType: 'leaf' \| 'and' \| 'or'`, `label: string` |
| `CanvasPanel` | MainContent | Flex-grow wrapper for React Flow | — |
| `AttackTreeCanvas` | CanvasPanel | React Flow instance with custom nodes | `nodes`, `edges`, `onNodesChange`, `onEdgesChange`, `onConnect` |
| `LeafNode` | AttackTreeCanvas | Custom React Flow node for leaves | `data: { label, validationStatus }` |
| `AndGateNode` | AttackTreeCanvas | Custom React Flow node for AND gates | `data: { label, validationStatus }` |
| `OrGateNode` | AttackTreeCanvas | Custom React Flow node for OR gates | `data: { label, validationStatus }` |
| `RightSidebar` | MainContent | 320px collapsible right panel | `collapsed: boolean` |
| `PropertyPanel` | RightSidebar | Renders panel based on selection | `selectedNode: AttackTreeNode \| null` |
| `ScenarioInfoPanel` | PropertyPanel | Scenario metadata + sim config | `scenario: Scenario` |
| `LeafPropertyPanel` | PropertyPanel | FAIR inputs editor for leaf | `node: AttackTreeNode`, `onChange` |
| `GatePropertyPanel` | PropertyPanel | Gate type toggle + info | `node: AttackTreeNode`, `onChange` |
| `ResultsDrawer` | MainContent | Bottom collapsible results panel | `expanded: boolean`, `results: SimulationResult \| null` |
| `ResultsToggleBar` | ResultsDrawer | 32px bar with expand/collapse toggle | `expanded: boolean`, `onToggle`, `lastRunDuration: number \| null` |
| `ResultsSummary` | ResultsDrawer | Table of summary statistics | `summary: SimulationResult['summary']` |
| `ALEHistogram` | ResultsDrawer | D3 histogram visualization | `iterations: number[]` (raw ALE values) |
| `LoadScenarioModal` | AppShell | Modal for loading saved scenarios | `open: boolean`, `onClose`, `onLoad` |
| `ConfirmationDialog` | AppShell | Reusable confirm/cancel dialog | `open`, `title`, `message`, `onConfirm`, `onCancel` |

---

## 10. State Management (Zustand Store Shape)

For @frontend reference — the Zustand store should include:

```
scenarioStore:
  scenario: Scenario               // Current working scenario
  lossMagnitude: Distribution | undefined  // Scenario-level LM distribution
  isDirty: boolean                 // Unsaved changes flag
  selectedNodeId: string | null    // Currently selected node
  leftSidebarCollapsed: boolean
  rightSidebarCollapsed: boolean
  resultsDrawerExpanded: boolean

simulationStore:
  isRunning: boolean
  progress: number                 // 0-100
  results: SimulationResult | null
  error: string | null
```

---

## 11. Color Palette & Visual Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-app` | `#ffffff` | App background |
| `--bg-canvas` | `#f8f9fa` | Canvas background |
| `--bg-sidebar` | `#ffffff` | Sidebar background |
| `--border-panel` | `#e2e8f0` | Panel dividers |
| `--primary` | `#3b82f6` | Buttons, progress bar, links |
| `--primary-hover` | `#2563eb` | Button hover |
| `--danger` | `#ef4444` | Delete, destructive actions |
| `--warning` | `#f59e0b` | Validation warnings |
| `--success` | `#22c55e` | Validation pass, save confirmation |
| `--text-primary` | `#1e293b` | Body text |
| `--text-muted` | `#94a3b8` | Secondary text, placeholders |
| `--node-leaf` | `#ffffff` | Leaf node fill |
| `--node-and` | `#dbeafe` | AND gate fill (light blue) |
| `--node-or` | `#ffedd5` | OR gate fill (light orange) |
| `--font-family` | `'Inter', system-ui, sans-serif` | All text |
| `--font-mono` | `'JetBrains Mono', monospace` | Number inputs |

---

## 12. Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| App title | 18px | 700 | `--text-primary` |
| Section headers | 12px uppercase | 600 | `--text-muted` |
| Body text | 14px | 400 | `--text-primary` |
| Input labels | 13px | 500 | `--text-primary` |
| Input values | 14px | 400 | `--text-primary` |
| Node labels | 13px | 500 | `--text-primary` |
| Button text | 14px | 500 | white / `--text-primary` |
| Stats values | 16px | 600 | `--text-primary` |
| Muted / placeholder | 13px | 400 | `--text-muted` |

---

## 13. Spacing & Sizing

- **Base unit**: 4px.
- **Panel padding**: 16px (4 units).
- **Component gap**: 12px between form groups.
- **Button height**: 36px, border-radius 6px.
- **Input height**: 36px, border-radius 4px.
- **TopBar height**: 48px.
- **Results drawer collapsed**: 32px. Expanded: 300px.
- **Sidebar widths**: Left 240px, Right 320px.
- **Modal max-width**: 560px.
