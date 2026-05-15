import type { AttackTreeNode, Edge } from './attack-tree';
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
        meanALE: number;
        percentiles: Record<number, number>;
    }>;
    iterations: number;
    duration: number;
}
export interface Scenario {
    id: string;
    name: string;
    description?: string;
    nodes: AttackTreeNode[];
    edges: Edge[];
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
