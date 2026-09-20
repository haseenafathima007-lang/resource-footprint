import React, { useState, useEffect } from "react";
import type { BaselineProfile } from "@/engine";
import { validateProfile } from "@/engine";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  error?: string;
  field?: keyof BaselineProfile;
  onChange: (val: number) => void;
  helperText?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  error,
  field,
  onChange,
  helperText,
}) => {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const [rawText, setRawText] = useState<string>(String(value));
  const [localError, setLocalError] = useState<string | null>(null);

  // Restore the guard so raw text only resets when Number(rawText) differs from the incoming value
  useEffect(() => {
    if (rawText !== "" && Number(rawText) === value) {
      return;
    }
    setRawText(String(value));
    setLocalError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawText(raw);

    const testVal = raw.trim() === "" ? NaN : Number(raw);

    // Validate using the engine's validateProfile as the single shared source of messages
    if (field) {
      const errMap = validateProfile({ [field]: testVal });
      if (errMap && errMap[field]) {
        setLocalError(errMap[field]);
        return;
      }
    }

    if (raw.trim() === "" || !Number.isFinite(testVal)) {
      setLocalError(`${label} must be a valid number`);
      return;
    }

    if (testVal < min || testVal > max) {
      setLocalError(`${label} must be between ${min} and ${max}`);
      return;
    }

    setLocalError(null);
    onChange(testVal);
  };

  const activeError = error || localError;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {unit && <span className="text-xs text-ink-muted">{unit}</span>}
      </div>

      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={rawText}
          onChange={handleChange}
          aria-invalid={Boolean(activeError)}
          aria-describedby={
            activeError ? errorId : helperText ? helperId : undefined
          }
          className={`w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border bg-surface-raised text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeError
              ? "border-negative focus-visible:ring-negative"
              : "border-border hover:border-ink-muted/50"
          }`}
        />
      </div>

      {helperText && !activeError && (
        <p id={helperId} className="text-xs text-ink-muted">
          {helperText}
        </p>
      )}

      {activeError && (
        <p id={errorId} role="alert" className="text-xs text-negative font-medium">
          {activeError}
        </p>
      )}
    </div>
  );
};
