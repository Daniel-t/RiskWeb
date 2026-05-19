---
id: TASK-205
title: Shared Types Specification - Controls & Catalog
status: approved
priority: high
assigned: analyst
reviewers: []
depends_on: [TASK-203]
modifies: context/analyst/spec-control-types.md
---

# Shared Types Specification: Controls & Catalog

## 1. Overview

This specification defines TypeScript interfaces for Phase 2 (Controls & Enrichment). These types extend the existing shared type system in `shared/src/index.ts`. Implementation persona (@backend) will use this spec to write the actual code.

## 2. Control Library Types

### 2.1 Control

A reusable security control definition stored in the global library.

```typescript
/**
 * Category classifies how the control operates.
 * - preventive: Stops attacks before they succeed (firewall, MFA)
 * - detective: Identifies attacks in progress or after (SIEM, IDS)
 * - corrective: Reduces damage after a successful attack (backups, incident response)
 */
type ControlCategory = 'preventive' | 'detective' | 'corrective';

interface Control {
  /** UUID v4 */
  id: string;

  /** Human-readable control name, e.g. "Web Application Firewall" */
  name: string;

  /** Optional longer description of what this control does */
  description?: string;

  /** How the control operates */
  category: ControlCategory;

  /** MITRE ATT&CK technique IDs this control is relevant to, e.g. ["T1566.001", "T1190"] */
  attackTechniques: string[];

  /** MITRE D3FEND technique IDs implementing this control, e.g. ["D3-NTA", "D3-EAL"] */
  d3fendTechniques: string[];

  /**
   * Default LEF reduction effectiveness as a Distribution.
   * Values represent fraction reduced (0.8 = blocks 80%).
   * Sampled per Monte Carlo iteration.
   * Must produce values in [0, 1] (clamped if not).
   */
  lefReduction: Distribution;

  /**
   * Optional LM reduction effectiveness.
   * Same semantics as lefReduction but applied to scenario-level loss magnitude.
   * Most controls do NOT have this (only those that reduce damage, not frequency).
   */
  lmReduction?: Distribution;

  metadata: ControlMetadata;
}

interface ControlMetadata {
  /** ISO 8601 timestamp */
  created: string;
  /** ISO 8601 timestamp */
  modified: string;
  /** Origin of this control definition */
  source?: 'custom' | 'd3fend-mapped' | 'template';
}

/** Lightweight representation for list endpoints */
interface ControlMeta {
  id: string;
  name: string;
  category: ControlCategory;
  attackTechniques: string[];
  modified: string;
}
```

### 2.2 Validation Rules for Control

| Field | Rule |
|-------|------|
| `id` | Valid UUID v4 |
| `name` | Non-empty string, max 200 characters |
| `description` | Optional, max 2000 characters |
| `category` | One of: `preventive`, `detective`, `corrective` |
| `attackTechniques` | Array of strings matching pattern `T\d{4}(\.\d{3})?` |
| `d3fendTechniques` | Array of strings matching pattern `D3-[A-Z]{2,5}` |
| `lefReduction` | Valid `Distribution` (same rules as existing distributions) |
| `lmReduction` | Optional valid `Distribution` |

## 3. Control Assignment Types

### 3.1 ControlAssignment

Links a control from the library to a specific leaf node in a scenario.

```typescript
interface ControlAssignment {
  /** UUID v4 for this assignment instance */
  id: string;

  /** References Control.id from the global library */
  controlId: string;

  /** References AttackTreeNode.id (must be a leaf node) */
  nodeId: string;

  /**
   * Optional per-assignment override of the control's default LEF reduction.
   * If present, this is used instead of the control's lefReduction.
   * Use case: same control has different effectiveness in different contexts.
   */
  lefReductionOverride?: Distribution;

  /**
   * Optional per-assignment override of the control's default LM reduction.
   */
  lmReductionOverride?: Distribution;

  /**
   * Toggle control on/off without removing assignment.
   * Disabled controls are skipped during simulation.
   */
  enabled: boolean;
}
```

### 3.2 Validation Rules for ControlAssignment

| Field | Rule |
|-------|------|
| `id` | Valid UUID v4 |
| `controlId` | Valid UUID v4 (existence check is UI/API responsibility, not type-level) |
| `nodeId` | Non-empty string (must reference a leaf node; engine validates this) |
| `lefReductionOverride` | Optional valid `Distribution` |
| `lmReductionOverride` | Optional valid `Distribution` |
| `enabled` | Boolean |

## 4. Scenario Extension

The existing `Scenario` interface gains one optional field:

```typescript
interface Scenario {
  // ... all existing fields unchanged ...

  /**
   * Controls assigned to leaf nodes in this scenario.
   * Optional — absent or empty means no controls applied.
   * Backward compatible: old scenarios without this field load normally.
   */
  controlAssignments?: ControlAssignment[];
}
```

## 5. ATT&CK Catalog Types

### 5.1 AttackTechnique

Represents a MITRE ATT&CK Enterprise technique (read-only reference data).

```typescript
interface AttackTechnique {
  /** ATT&CK ID, e.g. "T1566" or "T1566.001" for sub-techniques */
  id: string;

  /** Human-readable name, e.g. "Phishing: Spearphishing Attachment" */
  name: string;

  /** ATT&CK tactic, e.g. "initial-access", "execution", "impact" */
  tactic: string;

  /** Brief description of the technique */
  description?: string;

  /** D3FEND technique IDs that counter this attack technique */
  d3fendCountermeasures: string[];
}
```

### 5.2 D3fendTechnique

Represents a MITRE D3FEND defensive technique (read-only reference data).

```typescript
interface D3fendTechnique {
  /** D3FEND ID, e.g. "D3-NTA" */
  id: string;

  /** Human-readable name, e.g. "Network Traffic Analysis" */
  name: string;

  /** D3FEND taxonomy category, e.g. "Detect", "Isolate", "Harden" */
  category: string;

  /** ATT&CK technique IDs that this D3FEND technique counters */
  counters: string[];
}
```

### 5.3 TechniqueMapping

Cross-reference between ATT&CK and D3FEND (used internally by catalog service).

```typescript
interface TechniqueMapping {
  /** ATT&CK technique ID */
  attackId: string;

  /** D3FEND technique ID */
  d3fendId: string;

  /**
   * Suggested default effectiveness for this pairing.
   * Used when auto-generating a Control from a D3FEND mapping.
   */
  suggestedLefReduction?: Distribution;
}
```

## 6. SimulationResult Extension

```typescript
interface SimulationResult {
  // ... all existing fields unchanged ...

  /**
   * Warnings generated during simulation related to control configuration.
   * Example: "Node 'Phishing' has combined control reduction >99%"
   */
  controlWarnings?: string[];
}
```

## 7. Summary of All New Exports

The following should be exported from `shared/src/index.ts`:

### Types/Interfaces
- `ControlCategory`
- `Control`
- `ControlMetadata`
- `ControlMeta`
- `ControlAssignment`
- `AttackTechnique`
- `D3fendTechnique`
- `TechniqueMapping`

### Modified Interfaces
- `Scenario` — add optional `controlAssignments` field
- `SimulationResult` — add optional `controlWarnings` field

## 8. Backward Compatibility

- `Scenario.controlAssignments` is optional (`?:`). Existing scenarios without this field load without error.
- `SimulationResult.controlWarnings` is optional. Existing results remain valid.
- No existing fields are removed or renamed.
- No breaking changes to existing API contracts.
