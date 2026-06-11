---
id: SPEC-PDF-REPORT
title: PDF Report Generation Specification
status: draft
assigned: analyst
epic: E4.2
depends_on: []
created: 2026-05-25
modifies: context/analyst/spec-pdf-report.md
---

# PDF Report Generation Specification

This document specifies client-side PDF report generation for RiskWeb. The report captures a scenario's full analysis in a shareable, printable format.

Implementors: @frontend (service + UI button). Reviewers: @ux (layout), @secarch (dependency vetting).

---

## 1. Motivation

Users need to share risk analysis results with stakeholders who don't have access to the RiskWeb app (e.g., management, auditors, compliance teams). A PDF report provides a self-contained, professional artifact that includes the attack tree, FAIR inputs, simulation results, and key visualizations.

---

## 2. Report Contents

The PDF report contains the following sections, in order:

### 2.1 Cover / Header

- Scenario name (large, bold)
- Scenario description (if present)
- Generation timestamp
- RiskWeb version/branding line

### 2.2 Attack Tree Visualization

- Visual capture of the React Flow canvas showing the full attack tree
- Node labels, gate types (AND/OR), and leaf indicators must be legible
- Control badges on leaves should be visible
- Capture method: SVG serialization of the `.react-flow` container (preferred) or html2canvas fallback

### 2.3 FAIR Inputs Summary Table

A table listing each leaf node with its FAIR inputs:

| Node | LEF | TEF | Vulnerability | Controls Applied |
|------|-----|-----|---------------|-----------------|
| Leaf label | PERT(min, mode, max) | -- or PERT(...) | -- or PERT(...) | Control names |

- Scenario-level Loss Magnitude row at the bottom
- Distribution parameters formatted as `Type(param1, param2, ...)` for readability

### 2.4 Simulation Results Summary

- **Configuration**: iterations, seed, confidence intervals
- **Key metrics**: Mean ALE, Std Dev, P10, P50, P90 (formatted as currency or number)
- **Baseline vs. Controlled**: If controls are active, show both baseline and controlled ALE with reduction percentage
- Duration of simulation run

### 2.5 Distribution Histogram

- Reproduction of the ALE distribution histogram from the results drawer
- Capture as SVG/canvas image from the D3 visualization
- Include axis labels and title

### 2.6 Loss Exceedance Curve (if samples available)

- Reproduction of the exceedance curve from the results drawer
- Include axis labels (ALE on x-axis, exceedance probability on y-axis)

### 2.7 Sensitivity Tornado Chart (if sensitivity results available)

- Reproduction of the tornado chart (control-toggle or OAT, whichever was last run)
- Include bar labels and baseline reference line

### 2.8 Per-Node Results Table

| Node | Mean LEF | P10 | P50 | P90 |
|------|----------|-----|-----|-----|
| ... | ... | ... | ... | ... |

---

## 3. Page Layout

- **Page size**: A4 portrait (210 x 297 mm)
- **Margins**: 20mm all sides
- **Font**: Sans-serif (Helvetica or equivalent built-in PDF font)
- **Section breaks**: Each major section starts on a new page if content overflows
- **Tree visualization**: Scaled to fit within the printable width, maintaining aspect ratio. If the tree is very wide, use landscape orientation for that page only.

---

## 4. Library Recommendation

### Primary: jsPDF + SVG serialization

- **jsPDF** (`jspdf` npm package): Mature, widely-used client-side PDF library. Supports text, tables, images, and SVG.
- **SVG capture**: Use `XMLSerializer` to serialize the React Flow SVG container, then embed in PDF via `jsPDF.addSvgAsImage()` or convert to data URL first.
- **D3 charts**: Similarly serialize the SVG elements from histogram, exceedance curve, and tornado chart components.

### Fallback: html2canvas

- If SVG serialization proves insufficient (e.g., CSS styles not captured), use `html2canvas` to rasterize the DOM elements, then embed as PNG images in the PDF.
- **CSP note**: `html2canvas` creates inline `<canvas>` elements. Ensure no CSP restrictions block this. Since RiskWeb is a static SPA with no restrictive CSP headers, this should not be an issue.

### Auto-table plugin

- Use `jspdf-autotable` plugin for structured table generation (FAIR inputs table, per-node results).

### Bundle size consideration

- jsPDF: ~290 KB minified
- jspdf-autotable: ~45 KB
- html2canvas (if needed): ~40 KB
- Total: ~375 KB additional. Acceptable for a client-side app. Consider lazy-loading the PDF module.

---

## 5. UI Integration

### 5.1 Button Placement

- Add a "PDF Report" button in the TopBar toolbar, between "Compare" and "Run Simulation"
- Only enabled when simulation results exist (`results !== null`)
- Tooltip: "Generate PDF report of current scenario"

### 5.2 Generation Flow

1. User clicks "PDF Report"
2. Show a brief loading indicator (the TopBar progress bar or a spinner overlay)
3. Generate PDF in the main thread (not in worker -- needs DOM access for SVG capture)
4. Trigger browser download with filename: `{scenario_name}_report.pdf`
5. Hide loading indicator

### 5.3 Error Handling

- If SVG capture fails, fall back to text-only sections (no visualization images)
- Display toast with warning: "Report generated without visualizations"

---

## 6. Non-Functional Requirements

- **No server required**: Entire generation is client-side
- **Lazy loading**: PDF library should be dynamically imported (`import('jspdf')`) on first use, not bundled in the initial chunk
- **Performance**: Generation should complete within 5 seconds for a typical scenario (10-20 nodes)
- **File size**: Target < 2 MB for a typical report

---

## 7. Out of Scope

- Custom report templates or branding
- Editable PDF fields
- Multi-scenario comparison reports (may be added later)
- Server-side generation

---

## 8. Acceptance Criteria

1. Clicking "PDF Report" generates a downloadable PDF file
2. PDF contains all 8 sections listed in Section 2 (where data is available)
3. Attack tree visualization is legible and correctly represents the canvas
4. FAIR inputs table matches the property panel values
5. Simulation results match the results drawer display
6. Histogram, exceedance curve, and tornado chart are included as images (when available)
7. PDF opens correctly in standard PDF viewers (Chrome, Adobe Reader, Preview)
8. Button is disabled when no simulation results exist
9. PDF generation completes within 5 seconds for a 20-node scenario
10. jsPDF dependency passes @secarch supply chain review
