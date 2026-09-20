export type DeviationField =
  | 'shower_minutes_per_day'
  | 'ac_hours_per_day'
  | 'fan_hours_per_day'
  | 'laptop_hours_per_day'
  | 'laundry_loads_per_week';

export type DeviationMode = 'delta' | 'override';

export interface Deviation {
  id?: string;
  userId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  field: DeviationField;
  mode: DeviationMode;
  value: number;
  note?: string | null;
  createdAt?: string;
}
