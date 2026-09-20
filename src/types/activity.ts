export type ActivityType = 'SHOWER' | 'COOLING_APPLIANCES' | 'LAUNDRY';

export interface ShowerActivity {
  type: 'SHOWER';
  minutesPerDay: number;
  heater: 'none' | 'electric';
}

export interface CoolingActivity {
  type: 'COOLING_APPLIANCES';
  acHoursPerDay: number;
  fanHoursPerDay: number;
  laptopHoursPerDay: number;
}

export interface LaundryActivity {
  type: 'LAUNDRY';
  loadsPerWeek: number;
  machine: 'topLoad' | 'frontLoad';
}

export type ActivityInput = ShowerActivity | CoolingActivity | LaundryActivity;
