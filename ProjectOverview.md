## Risk Web

A web-based quantitative cyber risk analysis and attack path modeling tool for security analysts. RiskWeb combines FAIR risk quantification with attack tree modeling, enabling analysts to build threat scenarios, apply defensive controls, and simulate risk outcomes using Monte Carlo methods with Bayesian-updated distributions.

## Core Capabilities

### Attack Tree Modeling
- FAIR-integrated attack trees where nodes map directly to FAIR risk scenarios
- AND/OR gate logic for combining attack paths
- Hybrid canvas: free-form drag-and-drop building mode with toggle to auto-laid-out tree view

### FAIR Risk Quantification
- Simplified FAIR model by default (Loss Event Frequency + Loss Magnitude)
- Expandable to full FAIR taxonomy (TEF, Vulnerability, LEF, Primary/Secondary Loss) when deeper decomposition is needed

### Monte Carlo Simulation
- Client-side simulation engine running in Web Workers for responsive UI
- Bayesian-updated probability distributions across the attack tree
- Summary output by default: mean, P10, P50, P90
- Drill-down into detailed visualizations: loss exceedance curves, probability distributions, sensitivity analysis

### Control Library
- D3FEND defensive techniques mapped to MITRE ATT&CK techniques used in attack tree nodes
- Controls reduce both probability (likelihood of attack success) and impact (loss magnitude)

### Scenario Comparison
- Side-by-side comparison of risk scenarios (e.g., baseline vs. with controls applied)

## Tech Stack

### Frontend
- React
- React Flow (node-based canvas for attack tree editing)
- D3 (data visualizations: charts, distributions, exceedance curves)

### Backend
- NestJS (TypeScript)

### Storage
- Local file-based (JSON)
- Architected for future multi-user collaboration and database-backed persistence

### Import/Export
- JSON model format to start; additional formats (CSV, PDF reports, Open FAIR XML) to be evaluated later
