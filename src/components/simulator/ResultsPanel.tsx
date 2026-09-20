import React from "react";
import type { ActivityResult, Period } from "@/engine";
import { PeriodToggle } from "./PeriodToggle.tsx";
import { SavingsCard } from "./SavingsCard.tsx";
import { ComparisonBars } from "./ComparisonBars.tsx";
import { SummaryCard } from "./SummaryCard.tsx";
import { TrustBanner } from "./TrustBanner.tsx";

interface ResultsPanelProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  scaledBaseline: ActivityResult;
  scaledScenario: ActivityResult;
  scaledComparison: ActivityResult;
  summarySentence: string;
  debouncedAnnouncement: string;
  isAnyFactorUnverified: boolean;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  period,
  onPeriodChange,
  scaledBaseline,
  scaledScenario,
  scaledComparison,
  summarySentence,
  debouncedAnnouncement,
  isAnyFactorUnverified,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {/* Header controls: Heading & Period Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-ink">Impact & Savings</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Real-time projection based on empirical calculation factors
          </p>
        </div>

        <PeriodToggle period={period} onChange={onPeriodChange} />
      </div>

      {/* Trust banner notice if any factor is unverified */}
      <TrustBanner show={isAnyFactorUnverified} />

      {/* Debounced screen-reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {debouncedAnnouncement}
      </div>

      {/* Savings highlight card */}
      <SavingsCard
        scaledComparison={scaledComparison}
        period={period}
      />

      {/* Before vs After comparison bars */}
      <ComparisonBars
        scaledBaseline={scaledBaseline}
        scaledScenario={scaledScenario}
        period={period}
      />

      {/* Shareable 1-sentence summary card */}
      <SummaryCard summarySentence={summarySentence} />
    </div>
  );
};
