import React from "react";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(0);
      return;
    }
    const parsed = Number(raw);
    onChange(parsed);
  };

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
          value={Number.isFinite(value) ? value : 0}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : helperText ? helperId : undefined
          }
          className={`w-full px-3 py-2 text-sm rounded-lg border bg-surface-raised text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            error
              ? "border-negative focus-visible:ring-negative"
              : "border-border hover:border-ink-muted/50"
          }`}
        />
      </div>

      {helperText && !error && (
        <p id={helperId} className="text-xs text-ink-muted">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-negative font-medium">
          {error}
        </p>
      )}
    </div>
  );
};
