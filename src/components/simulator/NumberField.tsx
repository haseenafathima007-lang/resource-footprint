import React, { useState, useEffect } from "react";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  error?: string;
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
  onChange,
  helperText,
}) => {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const [rawText, setRawText] = useState<string>(String(value));
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync internal text when external value changes
  useEffect(() => {
    setRawText(String(value));
    setLocalError(null);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRawText(raw);

    if (raw.trim() === "") {
      setLocalError("Value is required");
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setLocalError("Please enter a valid number");
      return;
    }

    if (parsed < min || parsed > max) {
      setLocalError(`${label} must be between ${min} and ${max}`);
      return;
    }

    setLocalError(null);
    onChange(parsed);
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
          className={`w-full px-3 py-2 text-sm rounded-lg border bg-surface-raised text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
