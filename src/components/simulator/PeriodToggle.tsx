import React from "react";
import type { Period } from "@/engine";

interface PeriodToggleProps {
  period: Period;
  onChange: (period: Period) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export const PeriodToggle: React.FC<PeriodToggleProps> = ({ period, onChange }) => {
  return (
    <div
      role="group"
      aria-label="Select calculation period"
      className="inline-flex p-1 rounded-xl bg-surface-subtle border border-border"
    >
      {PERIODS.map(({ value, label }) => {
        const isSelected = period === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(value)}
            className={`px-3 py-2 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              isSelected
                ? "bg-surface-raised text-primary font-semibold shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
