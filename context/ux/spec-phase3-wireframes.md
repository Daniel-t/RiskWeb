---
id: TASK-305
title: Phase 3 UI Wireframes -- Advanced Analysis Features
status: approved
assigned: ux
epic: E3
depends_on: [TASK-301, TASK-302, TASK-303, TASK-304]
reviewers: [frontend, analyst]
created: 2026-05-21
modifies: context/ux/spec-phase3-wireframes.md
---

# Phase 3 UI Wireframes -- Advanced Analysis Features

> Spec produced by @ux for TASK-305. Intended audience: @frontend (TASK-320 through TASK-324).

This document specifies the UI wireframes and interaction design for four Phase 3 features:

1. TEF x Vulnerability toggle in the property panel
2. Sensitivity tornado charts
3. Loss exceedance curve
4. Scenario comparison view

---

## 0. Results Drawer Tab Restructure

### 0.1 Current State

The results drawer currently has three tabs visible only when controls are present: **Controlled | Baseline | Compare**. These tabs control which *dataset* is shown in a fixed layout of `ResultsSummary (40%) + ALEHistogram (60%)`.

### 0.2 Revised Tab Structure

Phase 3 adds two new visualization types (exceedance curve, sensitivity tornado) that are fundamentally different chart types -- not just dataset selectors. The tab bar is restructured into a **two-level** scheme: a primary tab row selects the *visualization type*, and a secondary toggle selects the *dataset*.

```
+--Results--[v]-----[Distribution] [Exceedance] [Sensitivity]-----+
|                                                                  |
|  (secondary)  [ Controlled | Baseline | Compare ]               |
|                                                                  |
|  +--ResultsSummary (40%)--+  +--ALEHistogram (60%)---------+    |
|  | Mean:     $142,000     |  |  [histogram bars]            |    |
|  | Std Dev:  $85,000      |  |                              |    |
|  | P10:      $28,000      |  |                              |    |
|  | P50:      $105,000     |  |                              |    |
|  | P90:      $310,000     |  |                              |    |
|  +------------------------+  +------------------------------+    |
+------------------------------------------------------------------+
```

**Primary tabs** (always visible when results exist):

| Tab | Content | Available When |
|-----|---------|----------------|
| **Distribution** | ResultsSummary + ALEHistogram (current layout) | Always (results exist) |
| **Exceedance** | VaR readouts + LossExceedanceCurve | Always (results exist; needs `samples`) |
| **Sensitivity** | SensitivityTornado (with sub-toggle) | Sensitivity analysis has been run |

**Secondary dataset toggle** (inside Distribution and Exceedance tabs):

| Toggle | Behavior |
|--------|----------|
| Controlled | Show controlled results only (default) |
| Baseline | Show baseline results only |
| Compare | Overlay both datasets |

The secondary toggle only appears when `hasControls` is true, same as today. The **Sensitivity** tab has its own internal sub-toggle (Control Impact / Input Sensitivity) and does not use the dataset toggle.

### 0.3 Tab Bar Wireframe

```
+--Results--[v]-------------------------------------------------------+
|  [Distribution]  [Exceedance]  [Sensitivity*]      Ctrl|Base|Cmp    |
|  ^^^^^^^^^^^^                                       ^^^^^^^^^^^^^^^  |
|  primary tabs (left)                   dataset toggle (right, same)  |
+----------------------------------------------------------------------+

* Sensitivity tab shows a dot indicator if results are stale or not yet run.
```

Primary tabs appear left-aligned next to the "Results" chevron. The dataset toggle remains right-aligned, exactly as today. Primary tab styling uses `fontSize: 12`, `fontWeight: 600`, `borderBottom: 2px` pattern, distinct from the pill-button style of the dataset toggle.

### 0.4 Component Changes

- `ResultsDrawer.tsx` -- Add `activeView` state: `'distribution' | 'exceedance' | 'sensitivity'`. Render primary tab bar. Conditionally render child component based on `activeView`.
- The existing `activeTab` (controlled/baseline/compare) remains for dataset selection within Distribution and Exceedance views.
- New Zustand state in `simulationStore`: `activeView: 'distribution' | 'exceedance' | 'sensitivity'` with setter `setActiveView`.

---

## 1. TEF x Vulnerability Toggle

### 1.1 Property Panel -- LeafPropertyPanel

#### 1.1.1 Direct Mode (Default -- Unchanged)

```
+-- Right Sidebar (320px) --------------------------+
| Leaf: Phishing Attack                              |
|                                                    |
| Label: [Phishing Attack_________]                  |
|                                                    |
| LEF (events/yr)                                    |
|   Distribution: [PERT       v]                     |
|   Min:  [0.5__]                                    |
|   Mode: [2.0__]                                    |
|   Max:  [8.0__]                                    |
|                                                    |
| [  Decompose into TEF x Vulnerability  ]  <-link  |
|                                                    |
| v Inputs complete                                  |
| -------------------------------------------------- |
| Assigned Controls (2)                              |
|   ...                                              |
+----------------------------------------------------+
```

The decompose link is styled as a text button (no border, primary color, 12px font) positioned below the LEF distribution editor.

#### 1.1.2 Decomposed Mode

When the user clicks "Decompose into TEF x Vulnerability", the single LEF editor is replaced by two editors:

```
+-- Right Sidebar (320px) --------------------------+
| Leaf: Phishing Attack                              |
|                                                    |
| Label: [Phishing Attack_________]                  |
|                                                    |
| +------------------------------------------------+ |
| | Frequency Mode: TEF x Vulnerability            | |
| |                                                | |
| | TEF (attempts/yr)                              | |
| |   Distribution: [PERT       v]                 | |
| |   Min:  [2.0__]                                | |
| |   Mode: [5.0__]                                | |
| |   Max:  [12.0_]                                | |
| |                                                | |
| | Vulnerability (0-1)                            | |
| |   Distribution: [PERT       v]                 | |
| |   Min:  [0.10_]                                | |
| |   Mode: [0.25_]                                | |
| |   Max:  [0.50_]                                | |
| |                                                | |
| | Expected LEF: ~1.25 events/yr                  | |
| +------------------------------------------------+ |
|                                                    |
| [  Use direct LEF instead  ]           <-link      |
|                                                    |
| v Inputs complete                                  |
| -------------------------------------------------- |
| Assigned Controls (2)                              |
|   ...                                              |
+----------------------------------------------------+
```

**Design notes:**

- The decomposed section has a subtle background (`#f8fafc`) and 1px border to visually group the TEF + Vulnerability editors as a unit.
- The header "Frequency Mode: TEF x Vulnerability" uses `section-header` styling.
- "Expected LEF" is a computed read-only label: `E[TEF] * E[Vulnerability]`, formatted to 2 decimal places with units. Updates live as the user types.
- The "Use direct LEF instead" link toggles back to direct mode. The `lef` field is auto-populated with a PERT distribution where mode = computed expected LEF.
- The Vulnerability `DistributionInput` needs a constrained variant: for PERT, min/mode/max clamped to [0, 1]. For constant, value clamped to [0, 1]. Validation error: "Vulnerability must be between 0 and 1."

#### 1.1.3 Validation States

| State | Indicator |
|-------|-----------|
| Direct mode, LEF defined | Green check: "Inputs complete" |
| Decomposed mode, both TEF and Vulnerability defined | Green check: "Inputs complete" |
| Decomposed mode, TEF defined but Vulnerability missing | Warning: "Missing Vulnerability distribution" |
| Decomposed mode, Vulnerability > 1 in PERT max | Warning: "Vulnerability max should be <= 1" |

### 1.2 Canvas Node Indicator

Leaf nodes in decomposed mode show a small "TEF x V" label below the node name:

```
+----------------------------+
|     Phishing Attack        |
|        TEF x V             |  <-- 9px, muted color, italic
| [shield]2                  |
+----------------------------+
```

**Implementation:** In `LeafNode.tsx`, check if `nodeData.fairInputs?.tef && nodeData.fairInputs?.vulnerability`. If true, render a small text element below the label span:
- `fontSize: 9`, `color: var(--text-muted)`, `fontStyle: italic`
- Positioned below the main label, within the existing 60px node height (reduce main label padding slightly)

The node height does NOT change.

### 1.3 Per-Node Results (Decomposed)

When simulation results include `meanTEF` and `meanVulnerability` for a decomposed node, and that node is selected, the property panel shows additional read-only stats below the distribution editors:

```
| Last Simulation Results               |
| Mean TEF:           4.8 attempts/yr   |
| Mean Vulnerability: 0.27 (27%)        |
| Effective LEF:      1.30 events/yr    |
```

This section only appears after a simulation has been run. Uses `fontSize: 12`, `color: var(--text-muted)`, monospace for values.

### 1.4 Component Hierarchy

```
LeafPropertyPanel
  +-- Label input (existing)
  +-- FrequencyModeSection (NEW)
  |     +-- if direct: DistributionInput(label="LEF")
  |     +-- if decomposed:
  |           +-- DistributionInput(label="TEF (attempts/yr)")
  |           +-- DistributionInput(label="Vulnerability (0-1)", constrained=true)
  |           +-- ExpectedLEFReadout (computed div)
  |     +-- toggle link
  +-- DecomposedStatsReadout (conditional on results)
  +-- ValidationIndicator (existing, updated logic)
  +-- NodeControlsSection (existing)
```

**New component:** `FrequencyModeSection.tsx` -- wraps the mode toggle logic and conditional rendering of LEF vs TEF+Vulnerability editors.

### 1.5 State Descriptions

| State | Appearance |
|-------|------------|
| **Empty** (new leaf, no inputs) | Direct mode shown by default. LEF editor with empty fields. No decompose indicator on canvas. |
| **Direct mode, populated** | Single LEF editor with user values. Green check. |
| **Decomposed mode, populated** | TEF + Vulnerability editors with computed Expected LEF. Green check. "TEF x V" on canvas. |
| **Decomposed mode, partial** | One editor filled, other missing/default. Warning indicator. |
| **Switching direct -> decomposed** | TEF auto-populated from current LEF distribution. Vulnerability set to PERT(0, 0.5, 1) default. |
| **Switching decomposed -> direct** | LEF auto-populated with PERT where mode = E[TEF] * E[Vuln]. TEF/Vuln fields removed from data. |

### 1.6 Interaction Rules

| Action | Behavior |
|--------|----------|
| Click "Decompose into TEF x Vulnerability" | Switch to decomposed mode. Auto-populate TEF from current LEF distribution. Set Vulnerability to PERT(0, 0.5, 1). |
| Click "Use direct LEF instead" | Switch to direct mode. Auto-populate LEF with PERT where mode = computed expected LEF. Remove `tef` and `vulnerability` from `fairInputs`. |
| Edit TEF or Vulnerability params | Recompute Expected LEF display. Mark results as outdated. |

---

## 2. Sensitivity Tornado Charts

### 2.1 Sensitivity Tab Layout

```
+--Results--[v]-------------------------------------------------------+
|  [Distribution]  [Exceedance]  [*Sensitivity*]                      |
+----------------------------------------------------------------------+
|                                                                      |
|  [Run Sensitivity]   Show top: [10 v]   [Control Impact | Input OAT]|
|                                                                      |
|  +--TornadoChart (100% width)--------------------------------------+|
|  |                                                                  ||
|  |  WAF            |==========================>|   +$143,000       ||
|  |  MFA            |============>|              |   +$56,000        ||
|  |  SIEM           |===>|                       |   +$12,000        ||
|  |                 |    |    |    |    |    |    |                   ||
|  |              $40K  $60K  $80K $100K $120K $160K $185K            ||
|  |                      ^ baseline ($42K)                           ||
|  +------------------------------------------------------------------+|
+----------------------------------------------------------------------+
```

### 2.2 Control Bar

```
+----------------------------------------------------------------------+
| [Run Sensitivity]   Show top: [10 v]   [Control Impact|Input OAT]    |
+----------------------------------------------------------------------+
```

| Element | Behavior |
|---------|----------|
| **Run Sensitivity** button | `btn btn-secondary`, 12px. Starts sensitivity analysis via worker. Separate from main "Run Simulation" button. Shows spinner + progress while running. Disabled if no simulation results exist. |
| **Show top N** dropdown | `<select>` with options: 5, 10, 15, 20, All. Default 10. Filters the tornado chart to top N items by absolute delta. |
| **Sub-toggle** | Pill-button toggle (same style as dataset toggle). Switches between Control Impact and Input OAT views. Default: Control Impact. |

### 2.3 Control Impact Tornado

Horizontal bar chart. Each bar represents one control.

```
                        baseline ALE
                            |
  WAF (preventive)    |=====|========================>     $185K
  MFA (preventive)    |=====|==========>                   $98K
  SIEM (detective)    |=====|==>                           $54K
                      |     |
                    $42K  (center line)
                   all on
```

**Design rules:**
- Y-axis: control names, left-aligned, truncated at 20 chars with ellipsis. Category badge (P/D/C pill) inline.
- X-axis: dollar amounts, same formatting as histogram (`$K`, `$M`, `$B`).
- Bars extend rightward from the baseline ALE (all controls on) to the ALE when that control is disabled.
- Bars sorted top-to-bottom by delta descending (most impactful at top).
- Bar color by category: preventive = `#3b82f6` (blue), detective = `#f59e0b` (amber), corrective = `#10b981` (green).
- Baseline ALE shown as a vertical dashed line.
- Bar height: 24px, gap: 4px between bars.
- Right-side label on each bar shows the ALE value when that control is disabled.

**Hover tooltip:**
```
+---------------------------------------+
| WAF (Preventive)                      |
| Baseline ALE:  $42,000   (all on)     |
| ALE w/o WAF:   $185,000              |
| Delta:         +$143,000 (+340%)      |
+---------------------------------------+
```

### 2.4 Input OAT Tornado

Horizontal bar chart. Bars extend in both directions from center (baseline ALE with all inputs at expected values).

```
                    baseline (all at expected)
                            |
  Scenario LM         |<===|============>|        $77,700 swing
  Leaf A: LEF          |<==|======>|              $33,000 swing
  Leaf B: LEF           |<=|===>|                 $20,000 swing
  WAF: lefReduction      |=|>|                    $8,000 swing
                         |  |  |
                       low center high
```

**Design rules:**
- Y-axis: input labels formatted as "Node: {label} > {field}" or "Control: {name} > {field}".
- X-axis: ALE in dollars.
- Left bar (P10 direction) uses lighter fill, right bar (P90 direction) uses darker fill, same base hue.
- Color by category: blue (`#3b82f6`) for LEF/TEF/Vulnerability, green (`#10b981`) for LM, orange (`#f59e0b`) for control reduction distributions.
- Center line: ALE when all inputs are at expected values.
- Sorted by swing (|ALE_high - ALE_low|) descending.

**Hover tooltip:**
```
+---------------------------------------+
| Scenario LM (Loss Magnitude)         |
| Input P10: $80,000   -> ALE: $16,800 |
| Input P90: $450,000  -> ALE: $94,500 |
| Swing: $77,700                        |
+---------------------------------------+
```

### 2.5 Progress Indicator

While sensitivity analysis is running:

```
+----------------------------------------------------------------------+
| [Cancel]   Running sensitivity analysis... (4/11 runs)               |
| [====================                                ] 36%           |
+----------------------------------------------------------------------+
|  (tornado chart area grayed out or shows previous results)           |
```

Reuses same progress bar styling as TopBar (`height: 4px`, `background: var(--primary)`, `transition: width 0.2s`).

### 2.6 Empty & Error States

| State | Appearance |
|-------|------------|
| **No results** | Sensitivity tab disabled (grayed text). Tooltip: "Run a simulation first." |
| **Results exist, sensitivity not run** | Tab enabled. Centered icon + "Click 'Run Sensitivity' to analyze which controls and inputs matter most." with Run button prominently displayed. |
| **Control Impact, no controls** | "No controls assigned. Assign controls to leaf nodes to analyze their impact." Switch to Input OAT still works. |
| **Input OAT, all constants** | "All input distributions are constant. Use PERT or lognormal distributions for meaningful sensitivity analysis." |
| **Sensitivity running** | Progress bar + "Running..." state. Run button changes to Cancel. |
| **Sensitivity complete** | Tornado chart rendered. "Completed in 450ms" shown below chart. |
| **Error** | Red banner: "Sensitivity analysis failed: {error}. Try running the main simulation again." |

### 2.7 Component Hierarchy

```
ResultsDrawer
  +-- PrimaryTabBar
  +-- (when activeView === 'sensitivity')
       SensitivityPanel (NEW)
         +-- SensitivityControlBar (NEW)
         |     +-- RunSensitivityButton
         |     +-- TopNDropdown
         |     +-- SubToggle (control-impact / input-oat)
         +-- SensitivityProgress (conditional)
         +-- TornadoChart (NEW, D3-based)
         +-- EmptyState / ErrorState (conditional)
```

**New components:**
- `SensitivityPanel.tsx` -- Container for the sensitivity tab content.
- `TornadoChart.tsx` -- D3 horizontal bar chart. Props: `items: SensitivityItem[]`, `baselineALE: number`, `mode: 'control-toggle' | 'oat-sweep'`, `topN: number`. Uses SVG + ResizeObserver pattern from `ALEHistogram.tsx`.

---

## 3. Loss Exceedance Curve

### 3.1 Exceedance Tab Layout

```
+--Results--[v]-------------------------------------------------------+
|  [Distribution]  [*Exceedance*]  [Sensitivity]   Ctrl|Base|Cmp      |
+----------------------------------------------------------------------+
|                                                                      |
|  +--VaRReadouts (30%)---+  +--LossExceedanceCurve (70%)----------+ |
|  |                      |  |  100% +                              | |
|  | VaR 90%:  $310,000   |  |       |  \                           | |
|  | VaR 95%:  $480,000   |  |   75% +   \                          | |
|  | Expected: $142,000   |  |       |    \                         | |
|  | Median:   $105,000   |  |   50% +     --\                      | |
|  |                      |  |       |        \                      | |
|  | Iterations: 10,000   |  |   25% +         ---\                 | |
|  |                      |  |       |             ----\             | |
|  |                      |  |    0% +--+--+--+--+--+---\--+--+    | |
|  |                      |  |       $0 $100K  $300K  $500K  $1M   | |
|  +----------------------+  +--------------------------------------+ |
+----------------------------------------------------------------------+
```

### 3.2 VaR Readouts Panel

Left side, 30% width. Key metrics in a format optimized for executive communication.

```
+------------------------------+
| Key Risk Metrics             |
|                              |
| VaR 90%                      |
|   $310,000                   |
|   90% confident losses       |
|   will not exceed this       |
|                              |
| VaR 95%                      |
|   $480,000                   |
|                              |
| Expected Loss (Mean)         |
|   $142,000                   |
|                              |
| Median Loss                  |
|   $105,000                   |
|                              |
| 10,000 iterations            |
+------------------------------+
```

**Styling:**
- Metric label: `fontSize: 11`, `fontWeight: 600`, `color: var(--text-muted)`, uppercase.
- Metric value: `fontSize: 20`, `fontWeight: 700`, `fontFamily: var(--font-mono)`.
- Sub-text: `fontSize: 11`, `color: var(--text-muted)`, italic.
- Each metric separated by `12px` gap.

In **Compare** mode, show side-by-side columns:

```
+--------------------------------------+
| Key Risk Metrics                     |
|                                      |
|                Baseline  Controlled  |
| VaR 90%:       $450K     $310K      |
| VaR 95%:       $680K     $480K      |
| Expected:      $220K     $142K      |
| Median:        $175K     $105K      |
|                                      |
| Reduction at P90: -$140K (-31%)     |
+--------------------------------------+
```

### 3.3 Loss Exceedance Curve Chart

Right side, 70% width. D3 line chart.

**Axes:**
- X-axis: Loss amount in dollars. Linear scale by default. Auto-switches to log scale when `max / min > 1000`. Axis label: "Annual Loss ($)".
- Y-axis: Exceedance probability, 0% to 100%. Linear scale. Axis label: "P(Loss > X)".

**Curves:**
- Single mode (Controlled or Baseline): solid blue line (`#3b82f6`), 2px stroke.
- Compare mode: dashed gray baseline (`#9CA3AF`, 60% opacity) + solid blue controlled. Same overlay pattern as ALEHistogram.
- Area under the controlled curve filled with `#3b82f6` at 8% opacity for visual weight.

**Annotations:**
- VaR 90% and VaR 95% shown as horizontal dashed lines at Y=10% and Y=5%, extending to curve intersection, then dropping vertically to X-axis. Small labels at intersection points.
- Mean ALE shown as a vertical dotted line from the X-axis.

**Hover interaction:**
- Crosshair follows cursor. Vertical line from X-axis to curve, horizontal line from Y-axis to curve.
- Tooltip anchored near cursor:
```
+---------------------------+
| P(Loss > $250,000) = 18% |
+---------------------------+
```
- Tooltip uses `fontSize: 12`, white background, `boxShadow: 0 2px 8px rgba(0,0,0,0.12)`, `borderRadius: 4`.

**Log scale indicator:**
When log scale is active, show a small label in the top-right corner: "Log scale" with a toggle to switch to linear.

### 3.4 Component Hierarchy

```
ResultsDrawer
  +-- PrimaryTabBar
  +-- (when activeView === 'exceedance')
       ExceedancePanel (NEW)
         +-- VaRReadouts (NEW)
         +-- LossExceedanceCurve (NEW, D3-based)
```

**New components:**
- `ExceedancePanel.tsx` -- Container with flex layout (30/70 split).
- `VaRReadouts.tsx` -- Static metrics display. Props: `results: SimulationResult`, `baselineResults?: SimulationResult`, `mode: ComparisonTab`.
- `LossExceedanceCurve.tsx` -- D3 line chart. Props: `samples: number[]`, `baselineSamples?: number[]`, `mode: ComparisonTab`, `results: SimulationResult`. Uses SVG + ResizeObserver pattern from `ALEHistogram.tsx`.

### 3.5 State Descriptions

| State | Appearance |
|-------|------------|
| **No results** | Exceedance tab disabled. |
| **Results but no samples** | Tab enabled. "Exceedance curve requires sample data. Re-run simulation to generate." |
| **Results with samples** | Full chart + VaR readouts. |
| **Compare mode, both have samples** | Overlay curves + side-by-side VaR readouts. |
| **Compare mode, only one has samples** | Show available curve. Note: "Baseline samples unavailable for overlay." |
| **Very few iterations (< 100)** | Show chart with amber banner: "Low iteration count produces a jagged curve. Consider increasing iterations." |
| **Deterministic (all samples identical)** | Vertical step line at that value. Note: "Deterministic scenario." |

### 3.6 Interaction Rules

| Action | Behavior |
|--------|----------|
| Hover on chart | Crosshair + tooltip showing exceedance probability at cursor X position. Uses binary search on sorted samples for O(log n) lookup. |
| Switch dataset toggle (Ctrl/Base/Cmp) | Chart re-renders with selected dataset(s). Smooth transition (300ms) on curve path. |
| Resize drawer | ResizeObserver triggers chart re-render. |
| Click "Log scale" toggle | Switch X-axis between log and linear. Animate transition. |

---

## 4. Scenario Comparison

### 4.1 Access Point

A new "Compare" button in the TopBar toolbar:

```
+---------------------------------------------------------------+
| [RiskWeb] | Scenario: [...] | [New][Save][Load][Export][Import]
|           [Compare][Auto Layout][Run Simulation]              |
+---------------------------------------------------------------+
```

Styling: `btn btn-secondary`, same as other toolbar buttons. Disabled with tooltip "Save at least 2 scenarios to compare" if fewer than 2 scenarios exist in IndexedDB.

### 4.2 Scenario Picker Modal

Triggered by clicking "Compare". Reuses modal pattern from `LoadScenarioModal.tsx`.

```
+-- Scenario Comparison Picker -----------------------------------------+
| Compare Scenarios                                              [x]    |
|                                                                       |
| Select 2-4 scenarios to compare.                                     |
|                                                                       |
| [Search scenarios...___________________________________]              |
|                                                                       |
| +-------------------------------------------------------------------+ |
| | [x] | Scenario Name        | Mean ALE    | P90       | Modified  | |
| |-----|----------------------|-------------|-----------|-----------|  |
| | [v] | Current State (ref)  | $250,000    | $580,000  | May 20    | |
| | [v] | + WAF Investment     | $140,000    | $320,000  | May 20    | |
| | [v] | + WAF + MFA          | $85,000     | $195,000  | May 21    | |
| | [ ] | Insider Threat       | $420,000    | $1,100K   | May 19    | |
| | [-] | Draft Scenario       | --          | --        | May 18    | |
| +-------------------------------------------------------------------+ |
|                                                                       |
| Selected: 3 of 4 max    Reference: "Current State" [change]         |
|                                                                       |
|                              [Cancel]  [Compare (3)]                  |
+-----------------------------------------------------------------------+
```

**Design rules:**
- **Checkboxes:** Multi-select (2-4 scenarios). Checkboxes on left column.
- **Unsimulated rows:** Grayed out checkbox (disabled), italic text, "--" for Mean ALE and P90. Tooltip: "Run simulation first."
- **Mean ALE / P90 columns:** `formatCurrency(results.summary.mean)` and `formatCurrency(results.summary.percentiles[0.9])`.
- **Reference indicator:** First selected scenario marked "(ref)". A "change" link below the table lets the user pick a different reference.
- **Compare button:** Enabled when 2+ simulated scenarios selected. Shows count: "Compare (3)".
- **Selection limit:** After 4 selected, remaining checkboxes disabled with tooltip: "Maximum 4 scenarios."
- **Data loading:** Extend `ScenarioMeta` with optional `meanALE` and `p90` fields so the picker doesn't need to load full scenario objects.

### 4.3 Comparison View

When the user clicks "Compare", the modal closes and the comparison view **replaces the results drawer content**. The primary tab bar is replaced with a comparison-specific header:

```
+-- Comparison View Header -------------------------------------------+
| Comparing: Current State (ref) vs. + WAF vs. + WAF + MFA    [Exit] |
+----------------------------------------------------------------------+
```

"Exit" closes comparison and returns to normal results drawer.

#### 4.3.1 Summary Cards Row

```
+----------------------------------------------------------------------+
| +---Card: Current State (ref)---+ +---Card: + WAF------+ +---Card--+ |
| | Mean: $250,000                | | Mean: $140,000      | | $85,000 | |
| | P90:  $580,000                | | P90:  $320,000      | | $195K   | |
| | Controls: 2 active            | | Controls: 4 active  | | 6 act.  | |
| | 10,000 iterations             | | 10,000 iterations   | | 10,000  | |
| +-------------------------------+ +---------------------+ +---------+ |
+----------------------------------------------------------------------+
```

Reference card has a subtle left border accent (`3px solid var(--primary)`). Other cards have neutral border. Card width: flex, equal distribution. Max 4 cards.

#### 4.3.2 Warning Banner

If iteration counts differ:

```
+----------------------------------------------------------------------+
| [!] Scenarios were simulated with different iteration counts.        |
|     Results may not be directly comparable.                          |
+----------------------------------------------------------------------+
```

Amber background (`#fef3c7`), amber border, `fontSize: 12`.

#### 4.3.3 Stats Table + Charts

```
+----------------------------------------------------------------------+
|  Summary Cards (row)                                                 |
+----------------------------------------------------------------------+
|  [Warning banner if applicable]                                      |
+----------------------------------------------------------------------+
|  +--ComparisonStatsTable (40%)---+  +--ComparisonCharts (60%)-----+ |
|  |                               |  |  [Histogram | Exceedance]    | |
|  | Metric | Ref    | +WAF  | +W+M| |                              | |
|  |--------|--------|-------|------| |  (selected chart type)        | |
|  | Mean   | $250K  |$140K  |$85K | |                              | |
|  | StdDev | $180K  |$95K   |$52K | |                              | |
|  | P10    | $45K   |$28K   |$18K | |                              | |
|  | P50    | $200K  |$105K  |$68K | |                              | |
|  | P90    | $580K  |$310K  |$180K| |                              | |
|  |        |        |       |     | |                              | |
|  | Delta columns:               | |                              | |
|  |   +WAF:  -$110K (-44%)      | |                              | |
|  |   +W+M:  -$165K (-66%)      | |                              | |
|  +-------------------------------+  +------------------------------+ |
+----------------------------------------------------------------------+
```

**Stats table:**
- One column per scenario. Reference column has no delta.
- Delta rows show absolute + percentage change vs reference.
- Green text for negative delta (risk reduction), red for positive (risk increase), gray for < 5% change.
- Reuses `formatCurrency()` and `formatReduction()` patterns from `ResultsSummary.tsx`.

**Chart area** has mini tab toggle: **Histogram | Exceedance**.

- **Histogram:** Overlaid ALE histograms. Reference gray 40% opacity, Scenario B blue 60%, C orange 60%, D green 60%. Shared bin width computed from combined range. Legend in top-right.
- **Exceedance:** Overlaid LEC curves. Reference dashed gray, others solid colored. Available only if all scenarios have `samples`.

### 4.4 Comparison Colors

| Slot | Color | Hex | Usage |
|------|-------|-----|-------|
| Reference | Gray | `#64748b` | Baseline/reference in all charts |
| Scenario B | Blue | `#3b82f6` | First non-reference |
| Scenario C | Orange | `#f59e0b` | Second non-reference |
| Scenario D | Green | `#10b981` | Third non-reference |

Defined as a constant array for reuse.

### 4.5 Component Hierarchy

```
AppShell
  +-- TopBar (updated: new Compare button + onCompare prop)
  +-- ...
  +-- ResultsDrawer
       +-- (normal mode) PrimaryTabBar + Distribution/Exceedance/Sensitivity
       +-- (comparison mode) ComparisonView (NEW)
             +-- ComparisonHeader (NEW)
             +-- ComparisonCards (NEW)
             +-- WarningBanner (conditional)
             +-- ComparisonContent
                   +-- ComparisonStatsTable (NEW)
                   +-- ComparisonCharts (NEW)
                         +-- mini tab toggle (Histogram | Exceedance)
                         +-- ComparisonHistogram (NEW)
                         +-- ComparisonExceedance (NEW)

ScenarioComparisonModal (NEW, modal)
  +-- Search input
  +-- Scenario table with checkboxes
  +-- Reference selector
  +-- Compare / Cancel buttons
```

**New components:**
- `ScenarioComparisonModal.tsx` -- Scenario picker modal (follows `LoadScenarioModal` pattern).
- `ComparisonView.tsx` -- Full comparison layout replacing normal results drawer content.
- `ComparisonHeader.tsx` -- Header bar with scenario names and Exit button.
- `ComparisonCards.tsx` -- Row of summary cards.
- `ComparisonStatsTable.tsx` -- Side-by-side stats with deltas.
- `ComparisonHistogram.tsx` -- N-overlay histogram (extends `ALEHistogram` pattern).
- `ComparisonExceedance.tsx` -- N-overlay LEC (extends `LossExceedanceCurve` pattern).

### 4.6 State Descriptions

| State | Appearance |
|-------|------------|
| **Compare button clicked, < 2 scenarios** | Disabled button with tooltip. |
| **Modal open, loading scenarios** | Spinner in table area. |
| **Modal open, scenarios loaded** | Table with checkboxes. Unsimulated scenarios grayed. |
| **0-1 selected** | Compare button disabled: "Select at least 2 scenarios." |
| **2-4 selected** | Compare button enabled with count. |
| **Comparison active** | Results drawer switches to ComparisonView. Normal tabs hidden. |
| **Scenario deleted while comparing** | Remove from comparison. If < 2 remain, auto-close comparison view. |
| **Mixed iteration counts** | Amber warning banner visible. |
| **No samples on some scenarios** | Exceedance tab in chart toggle disabled. Tooltip: "Some scenarios lack sample data." |

### 4.7 Interaction Rules

| Action | Behavior |
|--------|----------|
| Click "Compare" in TopBar | Open ScenarioComparisonModal. |
| Check/uncheck scenario | Toggle selection. Enforce 2-4 limit. |
| Click "change" reference | Dropdown of selected scenarios. Select new reference. Recompute deltas. |
| Click "Compare (N)" | Close modal. Switch results drawer to comparison mode. Load full scenario data. |
| Click "Exit" | Close comparison. Restore normal results drawer. |
| Hover on comparison chart | Tooltip shows values for all overlaid scenarios at cursor position. |

---

## 5. Responsive Behavior

### 5.1 Drawer Height

Current fixed 300px is maintained as default. Optional enhancement: drag handle at top border (6px hit area, cursor: `ns-resize`) allowing resize between 200px min and 500px max. Height persisted in `scenarioStore` as `resultsDrawerHeight`. **Nice-to-have -- can be deferred.**

### 5.2 Minimum Widths

| Component | Minimum Width |
|-----------|---------------|
| VaR Readouts panel | 200px |
| LossExceedanceCurve | 400px |
| TornadoChart | 500px (full drawer width) |
| ComparisonStatsTable | 280px |
| ComparisonCharts | 400px |

Below minimums, layout stacks vertically (stats on top, chart below).

---

## 6. Integration Points Summary

### 6.1 Files Modified

| File | Changes |
|------|---------|
| `shared/src/index.ts` | Add `tef?`, `vulnerability?` to `FAIRInputs`. Add `SensitivityResult`, `SensitivityItem` types. Add `samples?` to `SimulationResult`. Add `meanTEF?`, `meanVulnerability?` to `perNode`. |
| `frontend/src/store/simulationStore.ts` | Add `activeView`, `sensitivityResult`, `sensitivityRunning`, `sensitivityProgress`. Add comparison state. |
| `frontend/src/components/Layout/ResultsDrawer.tsx` | Add primary tab bar. Conditionally render Distribution/Exceedance/Sensitivity. Support comparison mode. |
| `frontend/src/components/Layout/TopBar.tsx` | Add `onCompare` prop and Compare button. |
| `frontend/src/components/PropertyPanel/LeafPropertyPanel.tsx` | Replace single LEF editor with `FrequencyModeSection`. |
| `frontend/src/components/Canvas/nodes/LeafNode.tsx` | Add "TEF x V" indicator for decomposed nodes. |

### 6.2 New Files

| File | Purpose |
|------|---------|
| `components/PropertyPanel/FrequencyModeSection.tsx` | TEF x Vulnerability toggle + editors |
| `components/Simulation/ExceedancePanel.tsx` | Container for exceedance tab |
| `components/Simulation/VaRReadouts.tsx` | Key metrics display |
| `components/Simulation/LossExceedanceCurve.tsx` | D3 LEC chart |
| `components/Simulation/SensitivityPanel.tsx` | Container for sensitivity tab |
| `components/Simulation/TornadoChart.tsx` | D3 tornado chart |
| `components/Comparison/ScenarioComparisonModal.tsx` | Picker modal |
| `components/Comparison/ComparisonView.tsx` | Full comparison layout |
| `components/Comparison/ComparisonHeader.tsx` | Header with exit |
| `components/Comparison/ComparisonCards.tsx` | Summary cards row |
| `components/Comparison/ComparisonStatsTable.tsx` | Side-by-side stats |
| `components/Comparison/ComparisonHistogram.tsx` | N-overlay histogram |
| `components/Comparison/ComparisonExceedance.tsx` | N-overlay LEC |

### 6.3 Design Tokens Reused

All new components use existing CSS custom properties -- no new design tokens required:
- `--bg-app`, `--bg-surface`, `--border-panel`
- `--text-primary`, `--text-muted`
- `--primary`, `--success`, `--warning`, `--danger`
- `--font-mono`
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.form-input`, `.form-select`, `.form-label`, `.section-header`
