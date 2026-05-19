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
}

// Attack tree types

export interface AttackTreeNode {
  id: string;
  type: "leaf" | "and" | "or";
  label: string;
  position: { x: number; y: number };
  fairInputs?: FAIRInputs;
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
    percentiles: Record<number, number>;
  }>;
  iterations: number;
  duration: number;
  controlWarnings?: string[];
}

// Scenario types

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  nodes: AttackTreeNode[];
  edges: Edge[];
  lossMagnitude?: Distribution;
  controlAssignments?: ControlAssignment[];
  simulationConfig: SimulationConfig;
  results?: SimulationResult;
  metadata: {
    created: string;
    modified: string;
  };
}

export interface ScenarioMeta {
  id: string;
  name: string;
  modified: string;
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
