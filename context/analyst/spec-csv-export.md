---
id: SPEC-CSV-EXPORT
title: CSV Results Export Specification
status: approved
assigned: analyst
epic: E4.3
depends_on: []
created: 2026-05-25
modifies: context/analyst/spec-csv-export.md
---

# CSV Results Export Specification

This document specifies CSV export of simulation results for use in spreadsheets, external analysis tools, or audit records.

Implementors: @frontend (service + UI button).

---

## 1. Motivation

Users need to perform further analysis on simulation outputs in tools like Excel, R, or Python. Raw ALE samples enable custom statistical analysis, and summary statistics provide quick reference data. CSV is the most portable tabular format.

---

## 2. Export Modes

Four single-format CSV files are offered. Each file contains exactly one tabular format (consistent column structure throughout). The user selects from a menu.

### 2.1 ALE Samples Export

Exports the raw ALE sample values from the Monte Carlo simulation.

**Structure:**

```csv
iteration,ale
1,125000.00
2,87500.00
3,210000.00
...
```

- **Column `iteration`**: 1-based index
- **Column `ale`**: ALE value for that iteration, 2 decimal places
- **Rows**: One per sample in `results.samples[]` (up to 10,000, matching the capped samples stored in SimulationResult)
- **Header row**: Always present

If baseline results are available (controlled scenario), export both:

```csv
iteration,ale_controlled,ale_baseline
1,125000.00,250000.00
2,87500.00,175000.00
...
```

### 2.2 Scenario Summary Export

Exports scenario-level aggregate statistics as a single-row table.

**Structure:**

```csv
scenario_name,iterations,duration_ms,mean_ale,stddev_ale,p10_ale,p50_ale,p90_ale
My Scenario,10000,1234,150000.00,45000.00,80000.00,140000.00,230000.00
```

- One header row + one data row
- If baseline results exist, add baseline columns:

```csv
scenario_name,iterations,duration_ms,mean_ale,stddev_ale,p10_ale,p50_ale,p90_ale,baseline_mean_ale,baseline_stddev_ale,baseline_p10_ale,baseline_p50_ale,baseline_p90_ale
My Scenario,10000,1234,150000.00,45000.00,80000.00,140000.00,230000.00,200000.00,60000.00,110000.00,190000.00,310000.00
```

### 2.3 Per-Node Results Export

Exports per-node simulation metrics as a flat table.

**Structure:**

```csv
node_id,node_label,node_type,mean_lef,p10_lef,p50_lef,p90_lef,mean_tef,mean_vulnerability
node-1,Phishing,leaf,2.50,1.00,2.00,4.00,5.00,0.50
node-2,Malware,leaf,1.20,0.50,1.00,2.00,,
node-3,Initial Access,or,3.70,1.50,3.00,6.00,,
```

- One header row + one row per node
- TEF and Vulnerability columns are empty for nodes without those inputs

### 2.4 Sensitivity Results Export (if available)

Exports sensitivity analysis results (control-toggle or OAT sweep) as a flat table.

**Structure (control-toggle):**

```csv
control_name,baseline_ale,with_control_ale,ale_delta,ale_delta_pct
Firewall,150000.00,120000.00,-30000.00,-20.00
EDR,150000.00,135000.00,-15000.00,-10.00
```

**Structure (OAT sweep):**

```csv
parameter,sweep_value,ale,ale_delta,ale_delta_pct
tef_node1,low,80000.00,-70000.00,-46.67
tef_node1,high,220000.00,70000.00,46.67
```

- One header row + one row per sensitivity item
- Only enabled when sensitivity results exist

---

## 3. File Naming

- Samples: `{scenario_name}_samples.csv`
- Summary: `{scenario_name}_summary.csv`
- Per-node: `{scenario_name}_nodes.csv`
- Sensitivity: `{scenario_name}_sensitivity.csv`
- Scenario name is sanitized: replace non-alphanumeric characters with `_`, truncate to 100 characters (matching existing `fileIO.ts` pattern)

---

## 4. Download Mechanism

Use the same `Blob` + `URL.createObjectURL` + click pattern already used in `fileIO.ts:exportScenarioToFile()`. No new dependencies required.

---

## 5. UI Integration

- Add a "CSV" dropdown button in the ResultsDrawer header bar, near the right edge
- Four options:
  - "Export Samples CSV" -- always enabled when results exist
  - "Export Summary CSV" -- always enabled when results exist
  - "Export Per-Node CSV" -- always enabled when results exist
  - "Export Sensitivity CSV" -- only enabled when sensitivity results exist
- All options disabled when no simulation results exist
- Defer exact placement and styling to @ux

---

## 6. Non-Functional Requirements

- No new dependencies (use native `Blob` and string concatenation)
- Delimiter: comma (`,`). No option for other delimiters needed.
- Encoding: UTF-8 with BOM (`\uFEFF` prefix) for Excel compatibility
- Numbers: 2 decimal places for ALE/monetary values, 4 decimal places for probabilities/frequencies

---

## 7. Out of Scope

- Excel (.xlsx) export
- Custom column selection
- Streaming export for very large datasets

---

## 8. Acceptance Criteria

1. Each CSV file contains exactly one tabular format (consistent columns throughout)
2. "Export Samples CSV" produces a valid CSV with iteration and ALE columns
3. If baseline results exist, both controlled and baseline ALE columns are included in samples export
4. "Export Summary CSV" produces a single-row table of scenario-level metrics
5. "Export Per-Node CSV" produces a table with one row per node
6. "Export Sensitivity CSV" produces a table with one row per sensitivity item
7. Sensitivity export is disabled when no sensitivity results exist
8. All files open correctly in Excel, Google Sheets, and LibreOffice Calc
9. UTF-8 BOM is present for Excel auto-detection
10. All export options are disabled when no simulation results exist
11. Filename follows the sanitization pattern from `fileIO.ts`
