import type { FAIRInputs } from './distribution';
export interface AttackTreeNode {
    id: string;
    type: "leaf" | "and" | "or";
    label: string;
    position: {
        x: number;
        y: number;
    };
    fairInputs?: FAIRInputs;
}
export interface Edge {
    id: string;
    sourceId: string;
    targetId: string;
}
