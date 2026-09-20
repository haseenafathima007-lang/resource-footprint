import React, { useState, useEffect } from "react";
import type { BaselineProfile } from "@/engine";
import { PROFILE_BOUNDS, validateProfile } from "@/engine";
import type { ScenarioHabits } from "@/lib/summary.ts";
import { formatNumber } from "@/lib/format.ts";
import { TrendingDown, TrendingUp, Minus, RotateCcw } from "lucide-react";

interface ScenarioPanelProps {
  baseline: BaselineProfile;
  scenario: ScenarioHabits;
  errors: Record<string, string>;
  onUpdate: (field: keyof ScenarioHabits, val: number) => void;
  onReset: () => void;
}

interface HabitControlConfig {
  key: keyof ScenarioHabits;
  label: string;
  unit: string;
  sliderMin: number;
  sliderMax: number;
  inputMin: number;
  inputMax: number;
  step: number;
}

const CONTROLS: HabitControlConfig[] = [
  {
    key: "showerMinutesPerDay",
    label: "Daily Shower Time",
    unit: "min",
    sliderMin: 0,
    sliderMax: 30,
    inputMin: PROFILE_BOUNDS.showerMinutesPerDay.min,
    inputMax: PROFILE_BOUNDS.showerMinutesPerDay.max,
    step: 1,
  },
  {
    key: "acHoursPerDay",
    label: "Air Conditioning (AC)",
    unit: "hours/day",
    sliderMin: 0,
    sliderMax: 16,
    inputMin: PROFILE_BOUNDS.acHoursPerDay.min,
    inputMax: PROFILE_BOUNDS.acHoursPerDay.max,
    step: 0.5,
  },
  {
    key: "fanHoursPerDay",
    label: "Ceiling Fan",
    unit: "hours/day",
    sliderMin: 0,
    sliderMax: 24,
    inputMin: PROFILE_BOUNDS.fanHoursPerDay.min,
    inputMax: PROFILE_BOUNDS.fanHoursPerDay.max,
    step: 1,
  },
  {
    key: "laptopHoursPerDay",
    label: "Laptop Working Time",
    unit: "hours/day",
    sliderMin: 0,
    sliderMax: 24,
    inputMin: PROFILE_BOUNDS.laptopHoursPerDay.min,
    inputMax: PROFILE_BOUNDS.laptopHoursPerDay.max,
    step: 1,
  },
  {
    key: "laundryLoadsPerWeek",
    label: "Laundry Loads",
    unit: "loads/week",
    sliderMin: 0,
    sliderMax: 14,
    inputMin: PROFILE_BOUNDS.laundryLoadsPerWeek.min,
    inputMax: PROFILE_BOUNDS.laundryLoadsPerWeek.max,
    step: 1,
  },
];

interface ScenarioControlRowProps {
  ctrl: HabitControlConfig;
  sVal: number;
  bVal: number;
  serverError?: string;
  onUpdate: (field: keyof ScenarioHabits, val: number) => void;
}

const ScenarioControlRow: React.FC<ScenarioControlRowProps> = ({
  ctrl,
  sVal,
  bVal,
  serverError,
  onUpdate,
}) => {
  const [rawText, setRawText] = useState<string>(String(sVal));
  const [localError, setLocalError] = useState<string | null>(null);

  // Restore the guard so raw text only resets when Number(rawText) differs from incoming value
  useEffect(() => {
    if (rawText !== "" && Number(rawText) === sVal) {
      return;
    }
    setRawText(String(sVal));
    setLocalError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sVal]);

  const delta = sVal - bVal;
  const inputId = `scenario-${ctrl.key}-input`;
  const sliderId = `scenario-${ctrl.key}-slider`;
  const activeError = serverError || localError;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawText(raw);

    const testVal = raw.trim() === "" ? NaN : Number(raw);
    const errMap = validateProfile({ [ctrl.key]: testVal });

    if (errMap && errMap[ctrl.key]) {
      setLocalError(errMap[ctrl.key]);
      return;
    }

    if (raw.trim() === "" || !Number.isFinite(testVal)) {
      setLocalError("Please enter a valid number");
      return;
    }

    setLocalError(null);
    onUpdate(ctrl.key, testVal);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    setRawText(String(parsed));
    setLocalError(null);
    onUpdate(ctrl.key, parsed);
  };

  return (
    <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <label htmlFor={sliderId} className="text-sm font-semibold text-ink">
            {ctrl.label}
          </label>
          <span className="text-xs text-ink-muted ml-2">
            (Baseline: {bVal} {ctrl.unit})
          </span>
        </div>

        {/* Delta indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border">
          {delta < -0.01 ? (
            <span className="flex items-center gap-1 text-positive bg-positive/10 border-positive/20 px-2 py-0.5 rounded-full">
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{formatNumber(delta)} {ctrl.unit} (reduction)</span>
            </span>
          ) : delta > 0.01 ? (
            <span className="flex items-center gap-1 text-negative bg-negative/10 border-negative/20 px-2 py-0.5 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>+{formatNumber(delta)} {ctrl.unit} (increase)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-ink-muted bg-surface border-border px-2 py-0.5 rounded-full">
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>No change</span>
            </span>
          )}
        </div>
      </div>

      {/* Interactive Dual Controls: Slider + Numeric Input */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            id={sliderId}
            type="range"
            min={ctrl.sliderMin}
            max={ctrl.sliderMax}
            step={ctrl.step}
            value={Math.min(sVal, ctrl.sliderMax)}
            onChange={handleSliderChange}
            aria-label={`${ctrl.label} slider`}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-ink-muted mt-1">
            <span>{ctrl.sliderMin}</span>
            <span>{ctrl.sliderMax} {ctrl.unit}</span>
          </div>
        </div>

        <div className="w-24 shrink-0">
          <input
            id={inputId}
            type="number"
            min={ctrl.inputMin}
            max={ctrl.inputMax}
            step={ctrl.step}
            value={rawText}
            onChange={handleInputChange}
            aria-label={`${ctrl.label} numeric input`}
            aria-invalid={Boolean(activeError)}
            className={`w-full min-h-[44px] px-2.5 py-1.5 text-sm font-semibold rounded-lg border bg-surface-raised text-ink text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeError
                ? "border-negative focus-visible:ring-negative"
                : "border-border hover:border-ink-muted"
            }`}
          />
        </div>
      </div>

      {activeError && (
        <p role="alert" className="text-xs text-negative font-medium">
          {activeError}
        </p>
      )}
    </div>
  );
};

export const ScenarioPanel: React.FC<ScenarioPanelProps> = ({
  baseline,
  scenario,
  errors,
  onUpdate,
  onReset,
}) => {
  const hasAnyChange = CONTROLS.some(
    (c) => Math.abs(scenario[c.key] - baseline[c.key]) >= 0.01
  );

  return (
    <section
      aria-labelledby="scenario-heading"
      className="p-5 sm:p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-6"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 id="scenario-heading" className="text-lg font-bold text-ink flex items-center gap-2">
            <span>Try a Change</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              Scenario
            </span>
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            Adjust any daily habit slider to see the immediate water and energy impact.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={!hasAnyChange}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-subtle text-ink-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset changes</span>
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {CONTROLS.map((ctrl) => (
          <ScenarioControlRow
            key={ctrl.key}
            ctrl={ctrl}
            sVal={scenario[ctrl.key]}
            bVal={baseline[ctrl.key]}
            serverError={errors[ctrl.key]}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  );
};
