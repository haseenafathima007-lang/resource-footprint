import React from "react";
import type { BaselineProfile } from "@/engine";
import { PROFILE_BOUNDS } from "@/engine";
import { NumberField } from "./NumberField.tsx";
import {
  Users,
  Droplets,
  Flame,
  Wind,
  Laptop,
  Shirt,
  Plus,
  Minus,
} from "lucide-react";

interface BaselinePanelProps {
  baseline: BaselineProfile;
  errors: Record<string, string>;
  onUpdate: <K extends keyof BaselineProfile>(field: K, val: BaselineProfile[K]) => void;
}

export const BaselinePanel: React.FC<BaselinePanelProps> = ({
  baseline,
  errors,
  onUpdate,
}) => {
  return (
    <section
      aria-labelledby="baseline-heading"
      className="p-5 sm:p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-6"
    >
      <div>
        <h2 id="baseline-heading" className="text-lg font-bold text-ink flex items-center gap-2">
          <span>Your Baseline Habits</span>
          <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Baseline
          </span>
        </h2>
        <p className="text-sm text-ink-muted mt-1">
          Set your typical daily habits to calculate your estimated resource baseline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Household Size Stepper (>= 44x44px touch targets) */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Household Size</span>
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => onUpdate("householdSize", Math.max(1, baseline.householdSize - 1))}
              disabled={baseline.householdSize <= PROFILE_BOUNDS.householdSize.min}
              aria-label="Decrease household size"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="text-lg font-bold text-ink min-w-[2rem] text-center"
            >
              {baseline.householdSize}
            </span>
            <button
              type="button"
              onClick={() => onUpdate("householdSize", Math.min(PROFILE_BOUNDS.householdSize.max, baseline.householdSize + 1))}
              disabled={baseline.householdSize >= PROFILE_BOUNDS.householdSize.max}
              aria-label="Increase household size"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-ink-muted ml-auto">
              {baseline.householdSize === 1 ? "person" : "people"}
            </span>
          </div>
          {errors.householdSize && (
            <p role="alert" className="text-xs text-negative font-medium">{errors.householdSize}</p>
          )}
        </div>

        {/* 2. Shower Duration */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Droplets className="w-4 h-4 text-water" aria-hidden="true" />
            <span>Shower Routine</span>
          </div>
          <NumberField
            id="baseline-showerMinutes"
            label="Daily shower duration"
            unit="min/day"
            value={baseline.showerMinutesPerDay}
            min={PROFILE_BOUNDS.showerMinutesPerDay.min}
            max={PROFILE_BOUNDS.showerMinutesPerDay.max}
            field="showerMinutesPerDay"
            error={errors.showerMinutesPerDay}
            onChange={(val) => onUpdate("showerMinutesPerDay", val)}
          />
        </div>

        {/* 3. Shower Heater Toggle */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Flame className="w-4 h-4 text-energy" aria-hidden="true" />
            <span id="heater-toggle-label">Water Heater</span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="heater-toggle-label"
            className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-surface border border-border"
          >
            <button
              type="button"
              role="radio"
              aria-checked={baseline.showerHeater === "electric"}
              onClick={() => onUpdate("showerHeater", "electric")}
              className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                baseline.showerHeater === "electric"
                  ? "bg-surface-raised text-energy shadow-sm border border-border"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Electric Geyser
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={baseline.showerHeater === "none"}
              onClick={() => onUpdate("showerHeater", "none")}
              className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                baseline.showerHeater === "none"
                  ? "bg-surface-raised text-ink shadow-sm border border-border"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              No Heater / Solar
            </button>
          </div>
        </div>

        {/* 4. Air Conditioning */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Wind className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>Air Conditioning</span>
          </div>
          <NumberField
            id="baseline-acHours"
            label="AC run time"
            unit="hours/day"
            value={baseline.acHoursPerDay}
            min={PROFILE_BOUNDS.acHoursPerDay.min}
            max={PROFILE_BOUNDS.acHoursPerDay.max}
            field="acHoursPerDay"
            error={errors.acHoursPerDay}
            onChange={(val) => onUpdate("acHoursPerDay", val)}
          />
        </div>

        {/* 5. Ceiling Fan */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Wind className="w-4 h-4 text-ink-muted" aria-hidden="true" />
            <span>Ceiling Fan</span>
          </div>
          <NumberField
            id="baseline-fanHours"
            label="Fan run time"
            unit="hours/day"
            value={baseline.fanHoursPerDay}
            min={PROFILE_BOUNDS.fanHoursPerDay.min}
            max={PROFILE_BOUNDS.fanHoursPerDay.max}
            field="fanHoursPerDay"
            error={errors.fanHoursPerDay}
            onChange={(val) => onUpdate("fanHoursPerDay", val)}
          />
        </div>

        {/* 6. Laptop Work */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Laptop className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Laptop Usage</span>
          </div>
          <NumberField
            id="baseline-laptopHours"
            label="Laptop working hours"
            unit="hours/day"
            value={baseline.laptopHoursPerDay}
            min={PROFILE_BOUNDS.laptopHoursPerDay.min}
            max={PROFILE_BOUNDS.laptopHoursPerDay.max}
            field="laptopHoursPerDay"
            error={errors.laptopHoursPerDay}
            onChange={(val) => onUpdate("laptopHoursPerDay", val)}
          />
        </div>

        {/* 7. Laundry Loads per Week */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Shirt className="w-4 h-4 text-water" aria-hidden="true" />
            <span>Laundry Frequency</span>
          </div>
          <NumberField
            id="baseline-laundryLoads"
            label="Loads washed"
            unit="loads/week"
            value={baseline.laundryLoadsPerWeek}
            min={PROFILE_BOUNDS.laundryLoadsPerWeek.min}
            max={PROFILE_BOUNDS.laundryLoadsPerWeek.max}
            field="laundryLoadsPerWeek"
            error={errors.laundryLoadsPerWeek}
            onChange={(val) => onUpdate("laundryLoadsPerWeek", val)}
          />
        </div>

        {/* 8. Washing Machine Type */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Shirt className="w-4 h-4 text-accent" aria-hidden="true" />
            <span id="machine-toggle-label">Washing Machine Type</span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="machine-toggle-label"
            className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-surface border border-border"
          >
            <button
              type="button"
              role="radio"
              aria-checked={baseline.laundryMachine === "topLoad"}
              onClick={() => onUpdate("laundryMachine", "topLoad")}
              className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                baseline.laundryMachine === "topLoad"
                  ? "bg-surface-raised text-primary shadow-sm border border-border"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Top Load
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={baseline.laundryMachine === "frontLoad"}
              onClick={() => onUpdate("laundryMachine", "frontLoad")}
              className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                baseline.laundryMachine === "frontLoad"
                  ? "bg-surface-raised text-primary shadow-sm border border-border"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Front Load
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
