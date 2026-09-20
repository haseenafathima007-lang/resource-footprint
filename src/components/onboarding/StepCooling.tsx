import React from 'react';
import type { BaselineProfile } from '@/engine';
import { PROFILE_BOUNDS } from '@/engine';
import { NumberField } from '@/components/simulator/NumberField.tsx';
import { Snowflake } from 'lucide-react';

interface StepCoolingProps {
  profile: BaselineProfile;
  errors: Record<string, string>;
  onUpdate: <K extends keyof BaselineProfile>(field: K, val: BaselineProfile[K]) => void;
}

export const StepCooling: React.FC<StepCoolingProps> = ({
  profile,
  errors,
  onUpdate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <div className="w-10 h-10 rounded-xl bg-energy-bg text-energy flex items-center justify-center shrink-0">
          <Snowflake className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-ink-muted">Cooling & Everyday Devices</p>
          <p className="text-sm font-medium text-ink">
            Major appliance and electronic device operating hours
          </p>
        </div>
      </div>

      <NumberField
        id="onboarding-acHoursPerDay"
        label="Air conditioner usage"
        unit="hours / day"
        value={profile.acHoursPerDay}
        min={PROFILE_BOUNDS.acHoursPerDay.min}
        max={PROFILE_BOUNDS.acHoursPerDay.max}
        step={0.5}
        field="acHoursPerDay"
        error={errors.acHoursPerDay}
        helperText="Shared household AC is divided among all occupants."
        onChange={(val) => onUpdate('acHoursPerDay', val)}
      />

      <NumberField
        id="onboarding-fanHoursPerDay"
        label="Ceiling fan usage"
        unit="hours / day"
        value={profile.fanHoursPerDay}
        min={PROFILE_BOUNDS.fanHoursPerDay.min}
        max={PROFILE_BOUNDS.fanHoursPerDay.max}
        step={0.5}
        field="fanHoursPerDay"
        error={errors.fanHoursPerDay}
        helperText="Shared household ceiling fan hours."
        onChange={(val) => onUpdate('fanHoursPerDay', val)}
      />

      <NumberField
        id="onboarding-laptopHoursPerDay"
        label="Laptop / computer usage"
        unit="hours / day"
        value={profile.laptopHoursPerDay}
        min={PROFILE_BOUNDS.laptopHoursPerDay.min}
        max={PROFILE_BOUNDS.laptopHoursPerDay.max}
        step={0.5}
        field="laptopHoursPerDay"
        error={errors.laptopHoursPerDay}
        helperText="Your personal computing device usage."
        onChange={(val) => onUpdate('laptopHoursPerDay', val)}
      />
    </div>
  );
};
