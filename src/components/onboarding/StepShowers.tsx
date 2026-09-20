import React from 'react';
import type { BaselineProfile } from '@/engine';
import { PROFILE_BOUNDS } from '@/engine';
import { NumberField } from '@/components/simulator/NumberField.tsx';
import { ShowerHead, Zap, Sun } from 'lucide-react';

interface StepShowersProps {
  profile: BaselineProfile;
  errors: Record<string, string>;
  onUpdate: <K extends keyof BaselineProfile>(field: K, val: BaselineProfile[K]) => void;
}

export const StepShowers: React.FC<StepShowersProps> = ({
  profile,
  errors,
  onUpdate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <div className="w-10 h-10 rounded-xl bg-water-bg text-water flex items-center justify-center shrink-0">
          <ShowerHead className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-ink-muted">Daily Shower Habits</p>
          <p className="text-sm font-medium text-ink">
            Water and heating electricity for your daily personal hygiene
          </p>
        </div>
      </div>

      <NumberField
        id="onboarding-showerMinutesPerDay"
        label="Daily shower duration"
        unit="minutes / day"
        value={profile.showerMinutesPerDay}
        min={PROFILE_BOUNDS.showerMinutesPerDay.min}
        max={PROFILE_BOUNDS.showerMinutesPerDay.max}
        step={1}
        field="showerMinutesPerDay"
        error={errors.showerMinutesPerDay}
        helperText="Typical urban showers last between 8 and 12 minutes."
        onChange={(val) => onUpdate('showerMinutesPerDay', val)}
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          Water heating method
        </label>
        <p className="text-xs text-ink-muted">
          Electric geysers use substantial power to heat water instantaneously or in storage tanks.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" role="radiogroup" aria-label="Water heating method">
          <button
            type="button"
            role="radio"
            aria-checked={profile.showerHeater === 'electric'}
            onClick={() => onUpdate('showerHeater', 'electric')}
            className={`flex items-center gap-3 p-3.5 min-h-[44px] rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              profile.showerHeater === 'electric'
                ? 'border-primary bg-primary/10 text-ink'
                : 'border-border bg-surface hover:bg-surface-subtle text-ink'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              profile.showerHeater === 'electric' ? 'bg-energy text-surface' : 'bg-surface-subtle text-ink-muted'
            }`}>
              <Zap className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-ink">Electric Geyser / Boiler</span>
              <span className="block text-xs text-ink-muted">Heated via grid electricity</span>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={profile.showerHeater === 'none'}
            onClick={() => onUpdate('showerHeater', 'none')}
            className={`flex items-center gap-3 p-3.5 min-h-[44px] rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              profile.showerHeater === 'none'
                ? 'border-primary bg-primary/10 text-ink'
                : 'border-border bg-surface hover:bg-surface-subtle text-ink'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              profile.showerHeater === 'none' ? 'bg-primary text-on-primary' : 'bg-surface-subtle text-ink-muted'
            }`}>
              <Sun className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-sm font-semibold text-ink">Solar / Gas / Ambient</span>
              <span className="block text-xs text-ink-muted">No electric water heating</span>
            </div>
          </button>
        </div>

        {errors.showerHeater && (
          <p role="alert" className="text-xs text-negative font-medium mt-1">
            {errors.showerHeater}
          </p>
        )}
      </div>
    </div>
  );
};
