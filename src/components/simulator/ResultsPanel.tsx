import React from "react";
import { useNavigate, useInRouterContext } from "react-router-dom";
import { Bookmark, ArrowRight } from "lucide-react";
import type { ActivityResult, Period, BaselineProfile } from "@/engine";
import { PeriodToggle } from "./PeriodToggle.tsx";
import { SavingsCard } from "./SavingsCard.tsx";
import { ComparisonBars } from "./ComparisonBars.tsx";
import { SummaryCard } from "./SummaryCard.tsx";
import { TrustBanner } from "./TrustBanner.tsx";
import { useAuth } from "@/hooks/useAuth.tsx";
import { savePendingBaseline } from "@/lib/pendingBaseline.ts";

interface ResultsPanelProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  scaledBaseline: ActivityResult;
  scaledScenario: ActivityResult;
  scaledComparison: ActivityResult;
  summarySentence: string;
  debouncedAnnouncement: string;
  isAnyFactorUnverified: boolean;
  currentBaseline: BaselineProfile;
}

function SaveBaselineButtonInner({
  currentBaseline,
  onNavigate,
}: {
  currentBaseline: BaselineProfile;
  onNavigate: (path: string, state?: unknown) => void;
}) {
  const { user } = useAuth();

  const handleSaveAsBaseline = () => {
    if (user) {
      onNavigate('/onboarding?from=simulator', { baseline: currentBaseline });
    } else {
      savePendingBaseline(currentBaseline);
      onNavigate('/auth', {
        from: { pathname: '/onboarding', search: '?from=simulator' },
      });
    }
  };

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={handleSaveAsBaseline}
        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] bg-primary text-on-primary hover:bg-primary-hover font-semibold text-sm rounded-xl shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Bookmark className="w-4 h-4 text-on-primary shrink-0" aria-hidden="true" />
        <span>Save this as my baseline</span>
        <ArrowRight className="w-4 h-4 text-on-primary shrink-0" aria-hidden="true" />
      </button>
      <p className="text-center text-xs text-ink-muted mt-2">
        {user
          ? "Transfer your simulator values to your account baseline profile."
          : "Keep these numbers and create an account to track your progress over time."}
      </p>
    </div>
  );
}

function SaveBaselineConnected({ currentBaseline }: { currentBaseline: BaselineProfile }) {
  const navigate = useNavigate();
  return (
    <SaveBaselineButtonInner
      currentBaseline={currentBaseline}
      onNavigate={(path, state) => navigate(path, { state })}
    />
  );
}

function SaveBaselineFallback({ currentBaseline }: { currentBaseline: BaselineProfile }) {
  return (
    <SaveBaselineButtonInner
      currentBaseline={currentBaseline}
      onNavigate={(path) => {
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      }}
    />
  );
}

export function SaveBaselineButton({ currentBaseline }: { currentBaseline: BaselineProfile }) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <SaveBaselineConnected currentBaseline={currentBaseline} />;
  }
  return <SaveBaselineFallback currentBaseline={currentBaseline} />;
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
  currentBaseline,
}) => {
  return (
    <div className="flex flex-col gap-5">
      {/* Header controls: Heading & Period Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-ink">Impact & Savings</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Real-time projection based on estimated calculation ranges
          </p>
        </div>

        <PeriodToggle period={period} onChange={onPeriodChange} />
      </div>

      {/* Trust banner notice if any factor is unverified */}
      <TrustBanner show={isAnyFactorUnverified} />

      {/* Debounced screen-reader live region with distinct accessible label */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {debouncedAnnouncement ? `Live estimate update: ${debouncedAnnouncement}` : ""}
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

      {/* Guest-to-Account Handoff: Save Baseline Action */}
      <SaveBaselineButton currentBaseline={currentBaseline} />
    </div>
  );
};
