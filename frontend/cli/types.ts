import type {
  Scenario,
  Control,
  SimulationResult,
  SensitivityResult,
} from '@shared/index';

export type { Scenario, Control, SimulationResult, SensitivityResult };

export interface Range {
  min: number;
  max: number;
}

export interface SimulationBounds {
  mean?: Range;
  stddev?: Range;
  percentiles?: Record<string, Range>;
  perNode?: Record<string, { meanLEF?: Range; meanTEF?: Range; meanVulnerability?: Range }>;
}

export interface SensitivityBounds {
  controlToggle?: {
    baselineALE?: Range;
    items?: Record<string, { delta?: Range; direction?: 'positive' | 'negative' }>;
  };
  oatSweep?: {
    baselineALE?: Range;
    items?: Record<string, { delta?: Range }>;
  };
}

export interface TestCase {
  name: string;
  description?: string;
  scenario: Scenario;
  controls?: Control[];
  simulationConfigOverride?: {
    iterations?: number;
    seed?: number;
    confidenceIntervals?: number[];
  };
  sensitivity?: {
    controlToggle?: boolean;
    oatSweep?: boolean;
  };
  expected?: {
    simulation?: SimulationBounds;
    baseline?: SimulationBounds;
    sensitivity?: SensitivityBounds;
  };
  expectedErrors?: string[];
}

export interface TestSuite {
  suite: string;
  cases: string[];
}

export interface BoundCheck {
  field: string;
  actual: number;
  min: number;
  max: number;
  pass: boolean;
}

export interface CaseResult {
  file: string;
  name: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  simulation?: {
    mean: number;
    stddev: number;
    percentiles: Record<number, number>;
    iterations: number;
    perNode?: SimulationResult['perNode'];
  };
  baseline?: {
    mean: number;
    stddev: number;
    percentiles: Record<number, number>;
    iterations: number;
    perNode?: SimulationResult['perNode'];
  };
  sensitivity?: SensitivityResult;
  bounds?: BoundCheck[];
  failures?: string[];
  errors?: string[];
  warnings?: string[];
}

export interface HarnessReport {
  harness: 'riskweb-simharness';
  timestamp: string;
  mode: 'validation' | 'exploratory';
  summary: {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    duration: number;
  };
  results: CaseResult[];
}

export interface CLIOptions {
  mode: 'validation' | 'exploratory';
  json: boolean;
  verbose: boolean;
  strict: boolean;
  iterations?: number;
  seed?: number;
  timeout: number;
  filter?: string;
}
