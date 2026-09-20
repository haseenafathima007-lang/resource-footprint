export interface Range {
  low: number;
  typical: number;
  high: number;
}

export interface ActivityResult {
  water: Range;   // in Litres (L)
  energy: Range;  // in Kilowatt-hours (kWh)
  waste: Range;   // in kg (0 in MVP, kept in data model for future extensibility)
}

export interface SustainabilityScore {
  overall: number; // 0 - 100
  waterScore: number;
  energyScore: number;
}
