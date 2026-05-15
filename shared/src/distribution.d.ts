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
export type Distribution = {
    type: "pert";
    params: PERTParams;
} | {
    type: "lognormal";
    params: LognormalParams;
} | {
    type: "constant";
    params: ConstantParams;
};
export interface FAIRInputs {
    lef: Distribution;
    lm: Distribution;
}
