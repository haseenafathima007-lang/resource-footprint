export interface Factor {
  id: string;
  label: string;
  unit: string;
  low: number;
  typical: number;
  high: number;
  source: string;
  version: string;
  region: string;
}

export interface FactorSetPayload {
  version: string;
  region: string;
  effectiveFrom: string;
  factors: Factor[];
}

export type FactorsMap = Record<string, Factor>;
