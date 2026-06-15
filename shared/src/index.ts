// Distribution types

export interface PERTParams {
  min: number;
  mode: number;
  max: number;
}

export interface LognormalParams {
  mu: number;
  sigma: number;
}

export interface ConstantParams {
  value: number;
}

export type Distribution =
  | { type: "pert"; params: PERTParams }
  | { type: "lognormal"; params: LognormalParams }
  | { type: "constant"; params: ConstantParams };

export interface FAIRInputs {
  lef: Distribution;
  tef?: Distribution;
  vulnerability?: Distribution;
}

// Attack tree types

export type NodeType = 'outcome' | 'event' | 'and' | 'or' | 'condition' | 'leaf';

export interface AttackTreeNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  /** @deprecated v1 compat — use tef/probability/lossMagnitude instead */
  fairInputs?: FAIRInputs;
  /** Threat Event Frequency distribution (event nodes only) */
  tef?: Distribution;
  /** Probability distribution, clamped 0–1 (condition nodes only) */
  probability?: Distribution;
  /** Loss Magnitude distribution (outcome nodes only) */
  lossMagnitude?: Distribution;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
}

// Simulation types

export interface SimulationConfig {
  iterations: number;
  seed?: number;
  confidenceIntervals: number[];
}

export interface SimulationResult {
  summary: {
    mean: number;
    stddev: number;
    percentiles: Record<number, number>;
  };
  perNode: Record<string, {
    meanLEF: number;
    meanTEF?: number;
    meanVulnerability?: number;
    meanProbability?: number;
    domain?: 'frequency' | 'probability';
    percentiles: Record<number, number>;
  }>;
  iterations: number;
  duration: number;
  controlWarnings?: string[];
  samples?: number[];
}

// Scenario types

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  nodes: AttackTreeNode[];
  edges: Edge[];
  /** @deprecated v1 — LM now lives on the outcome node */
  lossMagnitude?: Distribution;
  controlAssignments?: ControlAssignment[];
  simulationConfig: SimulationConfig;
  results?: SimulationResult;
  schemaVersion?: number;
  metadata: {
    created: string;
    modified: string;
  };
}

export interface ScenarioMeta {
  id: string;
  name: string;
  modified: string;
  meanALE?: number;
  p90?: number;
  hasSamples?: boolean;
}

// Control types

export type ControlCategory = 'preventive' | 'detective' | 'corrective';

export interface ControlMetadata {
  created: string;
  modified: string;
  source?: 'custom' | 'd3fend-mapped' | 'template';
}

export interface Control {
  id: string;
  name: string;
  description?: string;
  category: ControlCategory;
  attackTechniques: string[];
  d3fendTechniques: string[];
  lefReduction: Distribution;
  lmReduction?: Distribution;
  metadata: ControlMetadata;
}

export interface ControlMeta {
  id: string;
  name: string;
  category: ControlCategory;
  attackTechniques: string[];
  modified: string;
}

export interface ControlAssignment {
  id: string;
  controlId: string;
  nodeId: string;
  lefReductionOverride?: Distribution;
  lmReductionOverride?: Distribution;
  enabled: boolean;
}

// Catalog types

export interface AttackTechnique {
  id: string;
  name: string;
  tactic: string;
  description?: string;
  d3fendCountermeasures: string[];
}

export interface D3fendTechnique {
  id: string;
  name: string;
  category: string;
  counters: string[];
}

export interface TechniqueMapping {
  attackId: string;
  d3fendId: string;
  suggestedLefReduction?: Distribution;
}

// Sensitivity analysis types

export interface SensitivityRequest {
  type: 'controlToggle' | 'oatSweep';
  scenario: Scenario;
  controls: Control[];
  seed: number;
  oatIterations?: number;
}

export interface SensitivityItem {
  id: string;
  label: string;
  category: 'control' | 'lef' | 'tef' | 'vulnerability' | 'probability' | 'lm' | 'lefReduction' | 'lmReduction';
  aleLow: number;
  aleHigh: number;
  delta: number;
  inputLow?: number;
  inputHigh?: number;
  inputExpected?: number;
}

export interface SensitivityResult {
  type: 'controlToggle' | 'oatSweep';
  baselineALE: number;
  items: SensitivityItem[];
  duration: number;
}
