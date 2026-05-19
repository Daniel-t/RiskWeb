# Control UI Interaction Design & Wireframes

**Task:** TASK-204
**Status:** Complete
**References:** TASK-203 (control impact spec), TASK-205 (shared types), TASK-103 (MVP layout)

---

## 1. Layout Integration Overview

Controls integrate into the existing three-panel layout without structural changes. The left sidebar gains a tab system, the right property panel gains a new section for leaf nodes, leaf nodes gain badge overlays, and the results drawer gains comparison views.

```
+------------------------------------------------------------------+
| TopBar: RiskWeb | Scenario: [name]        [New][Save][Load][Run] |
+--------+-------------------------------------------+-------------+
| Left   |                                           | Right       |
| Sidebar|          Canvas                            | Sidebar     |
| 240px  |          (React Flow)                      | 320px       |
|        |                                            |             |
| [Nodes]|                                            | Property    |
| [Ctrls]|    +--------+     +--------+               | Panel       |
|        |    | Leaf   |-----| AND    |               | (context-   |
|        |    | [s][2] |     | Gate   |               |  aware)     |
|        |    +--------+     +--------+               |             |
|        |                                            |             |
+--------+-------------------------------------------+-------------+
| Results Drawer: [Baseline | With Controls]  Summary | Histogram  |
+------------------------------------------------------------------+
```

---

## 2. Left Sidebar: Tab System

### 2.1 Tab Bar

Add a horizontal tab bar at the top of the left sidebar content area.

```
+---------------------+
| [Nodes] | [Controls] |
+---------------------+
```

- **Style:** 12px uppercase labels, 500 weight, `--text-muted` default, `--primary` active
- **Active indicator:** 2px bottom border in `--primary`
- **Spacing:** Tabs fill width equally, 8px vertical padding
- **Default tab:** "Nodes" (preserves existing behavior)

### 2.2 Nodes Tab (Unchanged)

Existing node palette: Leaf Node, AND Gate, OR Gate draggable cards.

### 2.3 Controls Tab

```
+------------------------+
| [Nodes] | [Controls]   |
+------------------------+
| [Search controls...  ] |
| [v Filter: All       ] |
+------------------------+
| PREVENTIVE         (3) |
| +--------------------+ |
| | Email Filter       | |
| | LEF -80%   T1566   | |
| +--------------------+ |
| | WAF                | |
| | LEF -70%   T1190   | |
| +--------------------+ |
| | MFA                | |
| | LEF -90%   T1078   | |
| +--------------------+ |
|                        |
| DETECTIVE          (1) |
| +--------------------+ |
| | SIEM               | |
| | LEF -40%   T1059   | |
| +--------------------+ |
|                        |
| [Browse Catalog]       |
| [+ New Control]        |
+------------------------+
```

**Components:**

#### Search Bar
- Text input, 13px, placeholder "Search controls..."
- Filters by name, description, technique IDs
- Debounced (200ms)

#### Category Filter
- Dropdown: All | Preventive | Detective | Corrective
- Style: 13px, full width, same as existing dropdowns

#### Control Cards
- Grouped by category with collapsible section headers
- Section header: 12px uppercase, `--text-muted`, with count badge
- Card dimensions: full sidebar width minus 16px padding, auto height
- Card style: `--bg-sidebar` background, 1px `--border-panel` border, 6px border-radius, 8px padding
- **Card content:**
  - Row 1: Control name (13px, 500 weight, `--text-primary`)
  - Row 2: Effectiveness summary + first technique ID (11px, `--text-muted`)
    - Format: `LEF -80%` (mode value of distribution)
    - Technique: first `attackTechniques` entry, `+N more` if multiple
- **Card interactions:**
  - Click: select card (highlight border with `--primary`)
  - Double-click: open edit modal
  - Drag: initiate drag-to-canvas assignment (grab cursor)
- Card spacing: 4px gap between cards

#### Category Badge Colors (reuse existing tokens)
| Category | Background | Text |
|----------|-----------|------|
| Preventive | `#dbeafe` (`--node-and` bg) | `#3b82f6` (`--primary`) |
| Detective | `#fef3c7` (amber-100) | `#f59e0b` (`--warning`) |
| Corrective | `#dcfce7` (green-100) | `#22c55e` (`--success`) |

#### Empty State
```
+------------------------+
| [Nodes] | [Controls]   |
+------------------------+
|                        |
|    No controls yet     |
|                        |
|  Create your first     |
|  control or browse     |
|  the ATT&CK catalog    |
|                        |
|  [Browse Catalog]      |
|  [+ New Control]       |
|                        |
+------------------------+
```
- Text: 13px, `--text-muted`, centered
- Buttons: full-width, standard button style (36px height, 6px radius)

---

## 3. Control CRUD Modal

### 3.1 Create/Edit Control Modal

Opens centered over the app. Width: 560px. Max height: 80vh with scroll.

```
+--------------------------------------------------+
| Create Control                              [X]  |
+--------------------------------------------------+
| Name *                                           |
| [______________________________________]         |
|                                                  |
| Description                                      |
| [______________________________________]         |
| [______________________________________]         |
|                                                  |
| Category *                                       |
| [v Preventive                          ]         |
|                                                  |
| LEF Reduction (Effectiveness) *                  |
| [v PERT           ]                              |
| Min [0.60]  Mode [0.80]  Max [0.95]              |
|                                                  |
| [ ] Also reduces Loss Magnitude                  |
|   LM Reduction                                   |
|   [v PERT           ]                            |
|   Min [___]  Mode [___]  Max [___]               |
|                                                  |
| ATT&CK Techniques                               |
| [T1566] [T1190] [+ Add]                         |
|                                                  |
| D3FEND Techniques                                |
| [D3-NTA] [+ Add]                                |
|                                                  |
+--------------------------------------------------+
|                        [Cancel]  [Save Control]  |
+--------------------------------------------------+
```

**Field Details:**

| Field | Widget | Validation |
|-------|--------|------------|
| Name | Text input | Required, max 200 chars |
| Description | Textarea (2 rows) | Optional, max 2000 chars |
| Category | Dropdown | Required: preventive/detective/corrective |
| LEF Reduction | Distribution input (reuse existing) | Required, valid Distribution |
| LM Reduction | Checkbox toggle + Distribution input | Optional, shown when checked |
| ATT&CK Techniques | Tag input with pattern validation | `T\d{4}(\.\d{3})?` |
| D3FEND Techniques | Tag input with pattern validation | `D3-[A-Z]{2,5}` |

**States:**
- **Create:** Title "Create Control", empty fields, "Save Control" button
- **Edit:** Title "Edit Control", pre-filled fields, "Save Changes" button
- **Validation error:** Red border on invalid fields, error message below field (13px, `--danger`)

**Tag Input Behavior:**
- Type technique ID, press Enter or comma to add tag
- Each tag: pill shape, 11px, category-colored background, (x) to remove
- Invalid patterns show red border and "Invalid format" message

### 3.2 Delete Confirmation

Standard confirmation dialog (400px width):
```
+----------------------------------------+
| Delete Control                    [X]  |
+----------------------------------------+
| Are you sure you want to delete        |
| "Email Filter"?                        |
|                                        |
| This control is assigned to 3 nodes    |
| across 2 scenarios. Assignments will   |
| become orphaned.                       |
|                                        |
+----------------------------------------+
|              [Cancel]  [Delete]        |
+----------------------------------------+
```
- Delete button: `--danger` background, white text
- Usage count helps user understand impact

---

## 4. Control Assignment Interaction

### 4.1 Primary Method: Property Panel Picker

When a leaf node is selected, the right panel "Assigned Controls" section includes an "Add Control" button that opens a picker popover.

```
Assigned Controls
+----------------------------------+
| [+ Add Control]                  |
+----------------------------------+

       |  (popover opens below)
       v

+----------------------------------+
| [Search controls...            ] |
+----------------------------------+
| Email Filter          Preventive |
|   LEF -80%                [Add]  |
+----------------------------------+
| WAF                   Preventive |
|   LEF -70%                [Add]  |
+----------------------------------+
| SIEM                  Detective  |
|   LEF -40%                [Add]  |
+----------------------------------+
| Security Training     Preventive |
|   LEF -30%                [Add]  |
+----------------------------------+
```

- Popover: 300px wide, max 320px tall with scroll
- Search filters list in real time
- Already-assigned controls: grayed out with "Assigned" label instead of [Add]
- Click [Add]: assigns control, adds to node's control list, popover stays open for multi-add
- Click outside or press Escape: close popover

### 4.2 Secondary Method: Drag from Sidebar

- **Drag start:** Grab control card from left sidebar Controls tab
- **Drag over canvas:** Show ghost card following cursor
- **Drag over leaf node:** Leaf node shows blue dashed border highlight (drop zone)
- **Drag over gate node:** No drop zone (controls apply to leaves only)
- **Drop on leaf:** Assign control, show brief success flash (green border 300ms)
- **Drop on canvas (not on node):** Cancel, no action
- **Duplicate check:** If control already assigned to target leaf, show toast: "Control already assigned to this node"

### 4.3 Duplicate Prevention

The UI prevents assigning the same `controlId` to the same `nodeId` twice. Both assignment methods check for existing assignments before creating a new `ControlAssignment`.

---

## 5. Control Badges on Leaf Nodes

### 5.1 Badge Design

```
+------------------------+
|              [!]       |   <-- existing validation badge (top-right)
|    Phishing Attack     |
|                        |
| [s 2]                  |   <-- control badge (bottom-left)
+------------------------+
```

- **Position:** Bottom-left corner, 4px inset from edges
- **Size:** Auto width, 18px height
- **Shape:** Pill (9px border-radius)
- **Content:** Shield icon (12px) + space + count number (11px, 600 weight)
- **Background:** Category color of the majority of assigned controls
  - All same category: use that category's color
  - Mixed: use `#e2e8f0` (neutral gray, `--border-panel`)
- **No controls:** Badge hidden

### 5.2 Badge States

| State | Appearance |
|-------|-----------|
| 0 controls | No badge |
| 1+ controls, all enabled | Category-colored badge with count |
| Some disabled | Badge count shows enabled/total, e.g., "1/3" |
| Orphaned control | Orange border on badge (`--warning`) |

### 5.3 Badge Hover Tooltip

On hover, show a tooltip listing assigned controls:

```
+--------------------------+
| Email Filter (LEF -80%)  |
| WAF (LEF -70%)           |
| SIEM (LEF -40%) disabled |
+--------------------------+
```

- Tooltip: `--text-primary` on white background, 1px `--border-panel` border, 6px radius
- Disabled controls: `--text-muted` with "disabled" suffix
- Max 5 controls shown; if more: "+ N more"

---

## 6. Node Controls Section (Right Property Panel)

### 6.1 Panel Layout

When a leaf node is selected, add a collapsible "Assigned Controls" section below the existing LEF distribution inputs.

```
RIGHT PROPERTY PANEL (leaf selected)
+----------------------------------+
| LEAF NODE PROPERTIES             |
+----------------------------------+
| Label                            |
| [Phishing Attack              ]  |
|                                  |
| LEF (Loss Event Frequency)       |
| [v PERT           ]              |
| Min [1]  Mode [3]  Max [8]       |
|                                  |
| Status: Valid [checkmark]        |
+----------------------------------+
| ASSIGNED CONTROLS (2)       [-]  |
+----------------------------------+
| [on] Email Filter    Preventive  |
|      LEF -80% (PERT)       [x]  |
|      [> Override effectiveness]  |
|                                  |
| [on] Sec. Training   Preventive  |
|      LEF -30% (PERT)       [x]  |
|      [> Override effectiveness]  |
|                                  |
| Combined LEF reduction: ~88%    |
| [============================] 88% |
|                                  |
| [+ Add Control]                  |
+----------------------------------+
```

### 6.2 Component Breakdown

#### Section Header
- "ASSIGNED CONTROLS" — 12px uppercase, 600 weight, `--text-muted`
- Count badge in parentheses
- Collapse toggle [-/+] on right

#### Control Row
- **Toggle:** Small switch (on/off), toggles `ControlAssignment.enabled`
  - On: `--primary` track color
  - Off: `--border-panel` track color, row content at 50% opacity
- **Name:** 13px, 500 weight, truncated with ellipsis at ~180px
- **Category badge:** Small pill (11px), category-colored
- **Effectiveness:** 11px, `--text-muted`, shows mode value and distribution type
- **Remove button:** Small (x), `--text-muted`, `--danger` on hover
- **Override expander:** Chevron + "Override effectiveness" (11px, `--text-muted`)
  - Expands to show distribution inputs for `lefReductionOverride` and `lmReductionOverride`
  - Uses same distribution input widget as LEF inputs
  - "Reset to default" link to clear overrides

#### Combined Effectiveness Preview
- Text: "Combined LEF reduction: ~88%" (13px, 500 weight)
- Progress bar: full width, 6px height, `--primary` fill, `--border-panel` track
- Calculated from mode values of all enabled controls using multiplicative stacking
- Updated in real time as controls are toggled/added/removed
- If > 99%: bar turns `--warning` color, tooltip: "Very high reduction — verify assumptions"

#### Empty State
```
+----------------------------------+
| ASSIGNED CONTROLS (0)       [-]  |
+----------------------------------+
|                                  |
|   No controls assigned           |
|   Add controls to reduce risk    |
|                                  |
|   [+ Add Control]                |
+----------------------------------+
```

---

## 7. ATT&CK/D3FEND Catalog Browser

### 7.1 Access Point

"Browse Catalog" button in the Controls tab of the left sidebar (below control list).

### 7.2 Catalog Modal

Full-width modal (max 900px), 80vh height. Two-pane layout.

```
+------------------------------------------------------------------+
| ATT&CK / D3FEND Catalog                                    [X]  |
+------------------------------------------------------------------+
| TECHNIQUES                    | DETAILS                          |
+-------------------------------+----------------------------------+
| [Search techniques...       ] |                                  |
| [v Tactic: All              ] | T1566 - Phishing                 |
|                               | Tactic: Initial Access           |
| Initial Access            (8) |                                  |
|   T1566  Phishing         [>] | Spearphishing via email          |
|   T1566.001  Spearphish...[>] | attachments, links, or service.  |
|   T1190  Exploit Public...[>] |                                  |
|                               | D3FEND Countermeasures:          |
| Execution                 (9) | +------------------------------+ |
|   T1059  Command & Scri...[>] | | D3-NTA                       | |
|   T1059.001  PowerShell   [>] | | Network Traffic Analysis     | |
|                               | | Suggested: LEF -60%          | |
| Impact                    (7) | | [Create Control]             | |
|   T1486  Data Encrypted...[>] | +------------------------------+ |
|   ...                         | | D3-EAL                       | |
|                               | | Email Analysis               | |
|                               | | Suggested: LEF -75%          | |
|                               | | [Create Control]             | |
|                               | +------------------------------+ |
+-------------------------------+----------------------------------+
```

**Left Pane (Techniques List):**
- Search input filters by ID or name
- Tactic filter dropdown
- Grouped by tactic with collapsible sections
- Click technique to show details in right pane
- Selected technique: `--primary` left border, light blue background

**Right Pane (Detail + Countermeasures):**
- Technique name, tactic, description
- "D3FEND Countermeasures" section listing mapped defenses
- Each countermeasure card:
  - D3FEND ID and name
  - Suggested LEF reduction (from `TechniqueMapping.suggestedLefReduction`)
  - "Create Control" button: opens Create Control modal pre-filled with:
    - Name: D3FEND technique name
    - Category: inferred from D3FEND category (Detect->detective, Harden->preventive, etc.)
    - LEF Reduction: suggested distribution
    - ATT&CK Techniques: [selected technique ID]
    - D3FEND Techniques: [countermeasure ID]
    - `metadata.source`: `'d3fend-mapped'`

---

## 8. Baseline vs. Controlled Comparison (Results Drawer)

### 8.1 Results Drawer Extension

Add a toggle in the results drawer header when controls are present in the scenario.

```
+------------------------------------------------------------------+
| Results  [Baseline | With Controls]                    [collapse] |
+------------------------------------------------------------------+
| Summary                      | ALE Distribution                  |
| +--------------------------+ | +--------------------------------+ |
| |           Base   Ctrl    | | |   Baseline (gray)              | |
| | Mean    $756K   $94K     | | |   |||                          | |
| | P10     $320K   $40K     | | |  |||||  Controlled (blue)      | |
| | P50     $680K   $85K     | | |  ||||||    |||                  | |
| | P90     $1.4M   $175K    | | |  |||||||  |||||                 | |
| |                          | | |  |||||||| ||||||                | |
| | Reduction: 88%           | | |  P10  P50  P90                 | |
| +--------------------------+ | +--------------------------------+ |
+------------------------------------------------------------------+
```

### 8.2 Toggle Behavior

| Mode | Summary Table | Histogram |
|------|--------------|-----------|
| Baseline | Shows only baseline stats (existing) | Single histogram (existing) |
| With Controls | Two-column: Base + Ctrl, with % reduction row | Overlay: gray baseline + blue controlled |

- Toggle: Segmented control, 13px, `--primary` active segment
- Only visible when `scenario.controlAssignments` has enabled assignments
- Default: "With Controls" when controls exist

### 8.3 Overlay Histogram

- Baseline distribution: gray fill, 30% opacity
- Controlled distribution: `--primary` fill, 60% opacity
- Shared x-axis (ALE in currency)
- P-lines drawn for both (gray dashed for baseline, blue solid for controlled)
- Legend: top-right corner, two items

### 8.4 Reduction Callout

- Below the summary table, centered
- "Risk Reduction: 88%" — 16px, 600 weight, `--success` color
- Calculated as `1 - (controlled_mean / baseline_mean)` shown as percentage

---

## 9. Component Hierarchy

```
AppShell
  TopBar (unchanged)
  MainContent
    LeftSidebar
      SidebarTabs                    NEW
        NodePalette (existing)
        ControlLibraryPanel          NEW
          ControlSearchBar           NEW
          ControlCategoryFilter      NEW
          ControlCardList            NEW
            ControlCard              NEW
          CatalogBrowserButton       NEW
          NewControlButton           NEW
    Canvas
      LeafNode (modified)
        ControlBadge                 NEW
        ControlBadgeTooltip          NEW
      GateNode (unchanged)
    RightSidebar
      ScenarioInfoPanel (unchanged)
      LeafPropertyPanel (modified)
        LabelInput (existing)
        LEFDistributionInput (existing)
        AssignedControlsSection      NEW
          ControlAssignmentRow       NEW
            EnableToggle             NEW
            OverrideExpander         NEW
          CombinedEffectivenessBar   NEW
          AddControlButton           NEW
      GatePropertyPanel (unchanged)
  ResultsDrawer (modified)
    ResultsModeToggle                NEW
    ResultsSummary (modified — two-column mode)
    ALEHistogram (modified — overlay mode)
    ReductionCallout                 NEW

Modals (portal-rendered):
  ControlFormModal                   NEW
  DeleteControlDialog                NEW
  ControlPickerPopover               NEW
  CatalogBrowserModal                NEW
```

---

## 10. State Descriptions

### 10.1 Control Library Panel States

| State | Trigger | Display |
|-------|---------|---------|
| Empty | No controls in library | Empty state with CTA buttons |
| Populated | 1+ controls exist | Grouped card list |
| Searching | User types in search | Filtered list, "No matches" if none |
| Dragging | User drags a card | Card ghost follows cursor |

### 10.2 Control Assignment States

| State | Trigger | Display |
|-------|---------|---------|
| No controls | Leaf with 0 assignments | Empty state in panel, no badge on node |
| Has controls | Leaf with 1+ assignments | Control rows in panel, badge on node |
| All disabled | All assignments `enabled: false` | Dimmed rows, badge shows "0/N" |
| Orphaned | `controlId` not in library | Orange warning badge, warning row in panel |
| Override active | Assignment has override distribution | Override section expanded, "overridden" indicator |

### 10.3 Results Comparison States

| State | Trigger | Display |
|-------|---------|---------|
| No controls | Scenario has no assignments | Toggle hidden, baseline only |
| Controls present | 1+ enabled assignments | Toggle visible, default "With Controls" |
| All disabled | All assignments disabled | Toggle visible but "With Controls" shows same as baseline |

---

## 11. Keyboard & Accessibility

| Action | Shortcut | Context |
|--------|----------|---------|
| Switch sidebar tab | Ctrl+1 (Nodes), Ctrl+2 (Controls) | Left sidebar focused |
| Search controls | Ctrl+Shift+F | Controls tab active |
| Close modal | Escape | Any modal open |
| Toggle control enabled | Space | Control row focused |
| Remove control | Delete | Control row focused in panel |

- All interactive elements are keyboard-navigable (Tab order)
- Category badges use `aria-label` for screen readers
- Modals trap focus
- Color is not the sole indicator — icons and text supplement badge colors

---

## 12. Responsive Considerations

- **Minimum viewport:** 1280 x 720 (desktop only, per existing spec)
- **Left sidebar collapse:** Controls tab content hides with sidebar; tab state preserved
- **Right sidebar collapse:** Assigned controls section collapses with sidebar
- **Modal sizing:** Max 90vw on smaller screens, scroll for content overflow
- **Catalog modal:** Falls back to stacked layout below 768px width (if ever needed)
