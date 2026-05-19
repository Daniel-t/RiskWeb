---
id: TASK-114
title: MVP End-to-End Validation Report
status: complete
assigned: analyst
reviewers: human
depends_on: [TASK-111, TASK-112, TASK-113]
modifies: context/analyst/mvp-validation-report.md
date: 2026-05-16
---

# MVP End-to-End Validation Report

## Test Scenario Description

A simple attack tree was constructed to validate all MVP capabilities end-to-end:

- **Scenario name:** MVP Validation Test
- **Tree structure:** 1 OR-gate root node with 2 leaf children
- **Leaf 1 ("Phishing Attack"):** LEF = PERT(min=1, mode=5, max=10)
- **Leaf 2 ("Insider Threat"):** LEF = PERT(min=2, mode=4, max=8)
- **Scenario-level Loss Magnitude:** PERT(min=10000, mode=50000, max=200000)
- **Simulation config:** 10,000 iterations, no seed (random)

### Expected Values (Analytical)

- Leaf 1 PERT mean LEF: (1 + 4*5 + 10) / 6 = 5.17
- Leaf 2 PERT mean LEF: (2 + 4*4 + 8) / 6 = 4.33
- LM PERT mean: (10000 + 4*50000 + 200000) / 6 = 68,333
- OR-gate aggregation uses clamped formula (since child LEFs > 1)

---

## Steps Performed

### Step 1: Start Dev Servers
- Backend: `cd backend && npm install && npm run start:dev` -- started on localhost:3000
- Frontend: `cd frontend && npm install && npm run dev` -- started on localhost:5173
- Both servers started successfully with no errors

### Step 2: Navigate to Application
- Opened http://localhost:5173 in browser
- Initial state: empty canvas with "Drag nodes from the palette" instruction, node palette on left (Leaf Node, AND Gate, OR Gate), Scenario Info panel on right
- Screenshot: `screenshots/01-initial-state.png`

### Step 3: Create New Scenario
- Clicked "New" to ensure clean state
- Set scenario name to "MVP Validation Test" via the Scenario Info panel

### Step 4: Build Attack Tree
- Dragged OR Gate from palette to canvas center -- node appeared with green checkmark, labeled "OR Gate / OR"
- Dragged first Leaf Node to lower-left of canvas -- appeared as "New Leaf" with "!" warning badge
- Dragged second Leaf Node to lower-right of canvas -- appeared as "New Leaf" with "!" warning badge
- Stats updated: Nodes: 3, Edges: 0

### Step 5: Connect Nodes
- Dragged from OR Gate bottom (source) handle to Leaf 1 top (target) handle -- edge created
- Dragged from OR Gate bottom (source) handle to Leaf 2 top (target) handle -- edge created
- Stats updated: Edges: 2
- Screenshot: `screenshots/02-tree-connected.png`

### Step 6: Enter FAIR Inputs on Leaf 1
- Clicked first leaf node -- right panel switched to "Leaf: New Leaf" property panel
- Renamed to "Phishing Attack"
- Set LEF distribution: PERT, min=1, mode=5, max=10
- Status changed from "Missing inputs" to "Inputs complete" with checkmark

### Step 7: Enter FAIR Inputs on Leaf 2
- Clicked second leaf node -- right panel switched to its property panel
- Renamed to "Insider Threat"
- Set LEF distribution: PERT, min=2, mode=4, max=8
- Status changed to "Inputs complete"

### Step 8: Set Scenario-Level Loss Magnitude
- Clicked empty canvas area to deselect nodes -- right panel reverted to Scenario Info
- Set Loss Magnitude: PERT, min=10000, mode=50000, max=200000
- Validation status changed to "Validation: OK"
- "Run Simulation" button became enabled
- Screenshot: `screenshots/03-ready-to-simulate.png`

### Step 9: Run Monte Carlo Simulation
- Clicked "Run Simulation" button
- Results panel expanded automatically at the bottom
- Simulation completed: 10,000 iterations in 12ms
- Screenshot: `screenshots/04-simulation-results.png`

### Step 10: Verify Results
Summary statistics displayed:

| Statistic | Value |
|-----------|-------|
| Mean | $385,642 |
| Std Dev | $213,669 |
| P10 | $143,013 |
| P50 | $346,034 |
| P90 | $687,889 |

Per-node LEF statistics (from saved JSON):

| Node | Mean LEF | P10 | P50 | P90 |
|------|----------|-----|-----|-----|
| Phishing Attack | 5.19 | 2.95 | 5.15 | 7.49 |
| Insider Threat | 4.33 | 2.92 | 4.25 | 5.87 |
| OR Gate (root) | 5.64 | 3.91 | 5.58 | 7.50 |

**Validation of per-node LEF means:**
- Phishing Attack: observed 5.19 vs expected PERT mean 5.17 -- PASS (within sampling variance)
- Insider Threat: observed 4.33 vs expected PERT mean 4.33 -- PASS (exact match)

**Histogram:** Rendered correctly with right-skewed distribution from $0 to ~$1.6M. P10, P50, and P90 percentile overlay lines displayed and labeled. X-axis labeled "ALE ($)" with dollar-formatted tick marks. Y-axis shows frequency counts up to ~1,000.

### Step 11: Save Scenario
- Clicked "Save" button
- Scenario saved successfully via POST to backend API
- Confirmed via `GET /api/scenarios` which returned the scenario with id and timestamp
- File stored at `backend/dist/data/scenarios/{id}.json` (see note under bugs)

### Step 12: Reload Page
- Navigated to about:blank then back to http://localhost:5173
- Page loaded fresh with empty "Untitled Scenario" state
- Screenshot: `screenshots/05-after-reload.png`

### Step 13: Load Saved Scenario
- Clicked "Load" button -- modal dialog appeared with scenario list
- "MVP Validation Test" appeared with correct date (2026-05-16)
- Dialog features: search box, scenario table with name/date/delete columns
- Selected the scenario row, clicked "Load"
- Scenario loaded successfully
- Screenshot: `screenshots/06-after-load.png`

### Step 14: Verify Data Preservation
After loading, verified:
- Scenario name: "MVP Validation Test" -- PRESERVED
- Tree structure: OR Gate + 2 leaves with edges -- PRESERVED
- Node positions: approximately same layout -- PRESERVED
- Leaf 1 label: "Phishing Attack" -- PRESERVED
- Leaf 1 LEF: PERT(1, 5, 10) -- PRESERVED
- Leaf 2 label: "Insider Threat" -- PRESERVED
- Leaf 2 LEF: PERT(2, 4, 8) -- PRESERVED
- Loss Magnitude: PERT(10000, 50000, 200000) -- PRESERVED
- Iterations: 10000 -- PRESERVED
- Summary statistics (Mean, StdDev, P10, P50, P90): all PRESERVED
- Results panel shows "(last run: 12ms)" -- PRESERVED
- Green checkmarks on all nodes -- PRESERVED
- Validation status: OK -- PRESERVED
- Screenshots: `screenshots/07-loaded-results.png`, `screenshots/08-loaded-results-scrolled.png`

---

## Bugs and Issues Found

### BUG-1: Histogram Not Rendered After Load (Severity: Low)
**Description:** After loading a saved scenario, the summary statistics table is displayed but the ALE histogram is absent. The histogram only renders when results come fresh from the simulation worker.

**Root cause:** The `SimulationResult` saved to JSON includes only summary statistics, not the raw ALE sample array. On load, `simulationStore.setResults(scenario.results, [])` passes an empty samples array, so the histogram has no data to render.

**Impact:** Low -- users can re-run the simulation to see the histogram. Summary statistics are fully preserved.

**Recommendation:** Either (a) save the histogram bin data (not the full samples array) alongside results, or (b) show a message like "Re-run simulation to view histogram" when results are loaded without samples.

### BUG-2: File Storage Path Uses dist/ Directory (Severity: Low)
**Description:** Saved scenario JSON files are written to `backend/dist/data/scenarios/` instead of `backend/data/scenarios/`. This is because the NestJS storage service resolves paths relative to the compiled output directory rather than the project root.

**Impact:** Low for development, but the `dist/` directory is typically gitignored and rebuilt on deployment, which would delete saved data.

**Recommendation:** Configure the storage service to resolve paths relative to the project root (e.g., `process.cwd()`) rather than `__dirname`.

### ISSUE-3: Right Panel Header Clipped by Collapse Button (Severity: Cosmetic)
**Description:** The right sidebar's section header "SCENARIO INFO" appears as "CENARIO INFO" because the collapse button (>>) overlaps the first character.

**Impact:** Cosmetic only.

**Recommendation:** Add left padding to the section header or adjust the collapse button position.

### ISSUE-4: Leaf Node Labels Truncated on Canvas (Severity: Cosmetic)
**Description:** Long leaf node labels (e.g., "Phishing Attack") are truncated to "Phishing Atta..." on the canvas due to fixed node width.

**Impact:** Cosmetic -- the full label is visible in the property panel.

**Recommendation:** Consider auto-sizing node width to label length, or showing full label on hover tooltip.

---

## Capability Verdicts

| # | MVP Capability | Verdict | Notes |
|---|---------------|---------|-------|
| 1 | Build attack tree on canvas | **PASS** | Drag-and-drop from palette works. OR gate and leaf nodes created correctly. Connection via handle dragging works. Validation badges (checkmark/warning) update in real-time. Stats panel tracks node and edge counts. |
| 2 | Enter FAIR parameters on leaves | **PASS** | Property panel is context-sensitive (leaf shows LEF form, deselected shows Scenario Info). PERT distribution with min/mode/max fields works. Label editing works. "Inputs complete" / "Missing inputs" status updates correctly. Scenario-level LM editable in Scenario Info panel. |
| 3 | Run Monte Carlo simulation | **PASS** | 10,000 iterations completed in 12ms (well under 2-second target). Results panel auto-expands. Per-node LEF means match analytical PERT means within sampling variance. Button correctly disabled when validation fails, enabled when OK. |
| 4 | View summary statistics and histogram | **PASS** (with caveat) | Summary statistics table shows Mean, Std Dev, P10, P50, P90 with dollar formatting. Histogram renders with correct shape, axis labels, and percentile overlay lines. **Caveat:** histogram does not render after loading saved results (BUG-1). |
| 5 | Save/load scenarios | **PASS** | Save persists all scenario data (tree, FAIR inputs, LM, simulation config, results summary). Load dialog with search and delete functionality works. All data verified as preserved after round-trip. |

---

## Overall Assessment

**VERDICT: PASS -- MVP is functional.**

All five core MVP capabilities work end-to-end. The application successfully supports the complete workflow: build an attack tree, enter FAIR parameters, run Monte Carlo simulation, view results, and save/load scenarios with full data fidelity.

The simulation engine produces mathematically correct results: per-node LEF means match expected PERT distribution means, and the ALE distribution shape is reasonable for the given inputs. Performance exceeds the 2-second target by two orders of magnitude (12ms for 10,000 iterations on 3 nodes).

Two low-severity bugs were found (histogram not rendering on load, file storage path in dist/) and two cosmetic issues (header clipping, label truncation). None of these block MVP functionality.

### Recommendations for Next Steps
1. Fix BUG-2 (storage path) before any deployment -- data in `dist/` will be lost on rebuild
2. Address BUG-1 (histogram on load) in a follow-up task -- save histogram bin data with results
3. Proceed with security review by @secarch
4. Address cosmetic issues (ISSUE-3, ISSUE-4) in a UX polish pass
