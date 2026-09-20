export interface BaselineProfile {
  id?: string;
  userId?: string;
  effectiveFrom: string; // YYYY-MM-DD
  householdSize: number; // 1 - 20
  showerMinutesPerDay: number; // 0 - 120
  showerHeater: 'none' | 'electric';
  acHoursPerDay: number; // 0 - 24
  fanHoursPerDay: number; // 0 - 24
  laptopHoursPerDay: number; // 0 - 24
  laundryLoadsPerWeek: number; // 0 - 50
  laundryMachine: 'topLoad' | 'frontLoad';
  factorsVersion: string;
  createdAt?: string;
}
