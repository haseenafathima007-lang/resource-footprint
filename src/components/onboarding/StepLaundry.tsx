import React from 'react';
import type { BaselineProfile } from '@/engine';
import { PROFILE_BOUNDS } from '@/engine';
import { NumberField } from '@/components/simulator/NumberField.tsx';
import { WashingMachine } from 'lucide-react';

interface StepLaundryProps {
  profile: BaselineProfile;
  errors: Record<string, string>;
  onUpdate: <K extends keyof BaselineProfile>(field: K, val: BaselineProfile[K]) => void;
}

export const StepLaundry: React.FC<StepLaundryProps> = ({
  profile,
  errors,
  onUpdate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <WashingMachine className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-ink-muted">Laundry & Household Occupancy</p>
          <p className="text-sm font-medium text-ink">
            Washing habits and how many people share household appliances
          </p>
        </div>
      </div>

      <NumberField
        id="onboarding-householdSize"
        label="Household size"
        unit="people"
        value={profile.householdSize}
        min={PROFILE_BOUNDS.householdSize.min}
        max={PROFILE_BOUNDS.householdSize.max}
        step={1}
        field="householdSize"
        error={errors.householdSize}
        helperText="Shared resources (AC, fans, laundry) are divided by this number."
        onChange={(val) => onUpdate('householdSize', val)}
      />

      <NumberField
        id="onboarding-laundryLoadsPerWeek"
        label="Total household laundry loads"
        unit="loads / week"
        value={profile.laundryLoadsPerWeek}
        min={PROFILE_BOUNDS.laundryLoadsPerWeek.min}
        max={PROFILE_BOUNDS.laundryLoadsPerWeek.max}
        step={1}
        field="laundryLoadsPerWeek"
        error={errors.laundryLoadsPerWeek}
        helperText="Typical households run 3 to 6 loads each week."
        onChange={(val) => onUpdate('laundryLoadsPerWeek', val)}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Washing machine type
        </label>
        <p className="text-xs text-ink-muted">
          Front-load machines use significantly less water and detergent per cycle.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" role="radiogroup" aria-label="Washing machine type">
          <button
            type="button"
            role="radio"
            aria-checked={profile.laundryMachine === 'topLoad'}
            onClick={() => onUpdate('laundryMachine', 'topLoad')}
            className={`flex items-center gap-3 p-3.5 min-h-[44px] rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              profile.laundryMachine === 'topLoad'
                ? 'border-primary bg-primary/10 text-ink'
                : 'border-border bg-surface hover:bg-surface-subtle text-ink'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-surface-subtle text-ink-muted flex items-center justify-center shrink-0">
              <WashingMachine className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-ink">Top Load</span>
              <span className="block text-xs text-ink-muted">Standard agitator or impeller</span>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={profile.laundryMachine === 'frontLoad'}
            onClick={() => onUpdate('laundryMachine', 'frontLoad')}
            className={`flex items-center gap-3 p-3.5 min-h-[44px] rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              profile.laundryMachine === 'frontLoad'
                ? 'border-primary bg-primary/10 text-ink'
                : 'border-border bg-surface hover:bg-surface-subtle text-ink'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-surface-subtle text-ink-muted flex items-center justify-center shrink-0">
              <WashingMachine className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-ink">Front Load</span>
              <span className="block text-xs text-ink-muted">High-efficiency horizontal drum</span>
            </div>
          </button>
        </div>

        {errors.laundryMachine && (
          <p role="alert" className="text-xs text-negative font-medium mt-1">
            {errors.laundryMachine}
          </p>
        )}
      </div>
    </div>
  );
};
