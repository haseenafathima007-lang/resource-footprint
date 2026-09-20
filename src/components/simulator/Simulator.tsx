import React, { useRef, useState, useEffect } from "react";
import { useSimulatorState } from "@/hooks/useSimulatorState.ts";
import { BaselinePanel } from "./BaselinePanel.tsx";
import { ScenarioPanel } from "./ScenarioPanel.tsx";
import { ResultsPanel } from "./ResultsPanel.tsx";
import { formatTypicalValue } from "@/lib/format.ts";
import { TrendingDown, TrendingUp, Droplets, Zap } from "lucide-react";

export const Simulator: React.FC = () => {
  const {
    baseline,
    scenario,
    period,
    baselineErrors,
    scenarioErrors,
    isAnyFactorUnverified,
    scaledBaseline,
    scaledScenario,
    scaledComparison,
    summarySentence,
    debouncedAriaAnnouncement,
    updateBaselineField,
    updateScenarioField,
    resetScenario,
    setPeriod,
  } = useSimulatorState();

  const simulatorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isSimulatorInView, setIsSimulatorInView] = useState(true);
  const [isResultsInView, setIsResultsInView] = useState(false);

  // Monitor visibility of simulator section and results panel
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const simEl = simulatorRef.current;
    const resEl = resultsRef.current;
    if (!simEl || !resEl) return;

    const simObserver = new IntersectionObserver(
      ([entry]) => {
        setIsSimulatorInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    const resObserver = new IntersectionObserver(
      ([entry]) => {
        setIsResultsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    simObserver.observe(simEl);
    resObserver.observe(resEl);

    return () => {
      simObserver.disconnect();
      resObserver.disconnect();
    };
  }, []);

  const waterTyp = scaledComparison.water.typical;
  const energyTyp = scaledComparison.energy.typical;

  const periodLabel =
    period === "day"
      ? "day"
      : period === "week"
      ? "week"
      : period === "month"
      ? "month"
      : "year";

  // Sticky results bar only shows when simulator is in view AND results panel is not
  const showStickyBar = isSimulatorInView && !isResultsInView;

  return (
    <div id="simulator" ref={simulatorRef} className="relative pb-20 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Interactive Habit Inputs in Baseline -> Scenario Order */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <BaselinePanel
            baseline={baseline}
            errors={baselineErrors}
            onUpdate={updateBaselineField}
          />

          <ScenarioPanel
            baseline={baseline}
            scenario={scenario}
            errors={scenarioErrors}
            onUpdate={updateScenarioField}
            onReset={resetScenario}
          />
        </div>

        {/* Right Column: Dynamic Real-Time Results & Impact */}
        <div id="results-panel" ref={resultsRef} className="lg:col-span-5 lg:sticky lg:top-20">
          <ResultsPanel
            period={period}
            onPeriodChange={setPeriod}
            scaledBaseline={scaledBaseline}
            scaledScenario={scaledScenario}
            scaledComparison={scaledComparison}
            summarySentence={summarySentence}
            debouncedAnnouncement={debouncedAriaAnnouncement}
            isAnyFactorUnverified={isAnyFactorUnverified}
          />
        </div>
      </div>

      {/* Mobile-Only Compact Sticky Results Bar (below lg breakpoint) */}
      {showStickyBar && (
        <div
          role="region"
          aria-label="Current estimate summary"
          className="fixed bottom-0 left-0 right-0 z-40 bg-surface-raised/95 backdrop-blur-md border-t border-border shadow-lg px-4 py-3 flex items-center justify-between gap-3 text-xs lg:hidden"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="font-semibold text-ink capitalize">Per {periodLabel}:</span>

            {/* Water headline */}
            <div className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-water" aria-hidden="true" />
              {waterTyp > 0.05 ? (
                <span className="text-positive font-bold flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                  <span>Save ~{formatTypicalValue(waterTyp)} L</span>
                </span>
              ) : waterTyp < -0.05 ? (
                <span className="text-negative font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />
                  <span>+{formatTypicalValue(waterTyp)} L</span>
                </span>
              ) : (
                <span className="text-ink-muted">Water: unchanged</span>
              )}
            </div>

            {/* Energy headline */}
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-energy" aria-hidden="true" />
              {energyTyp > 0.05 ? (
                <span className="text-positive font-bold flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" aria-hidden="true" />
                  <span>Save ~{formatTypicalValue(energyTyp)} kWh</span>
                </span>
              ) : energyTyp < -0.05 ? (
                <span className="text-negative font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />
                  <span>+{formatTypicalValue(energyTyp)} kWh</span>
                </span>
              ) : (
                <span className="text-ink-muted">Energy: unchanged</span>
              )}
            </div>
          </div>

          <a
            href="#results-panel"
            className="shrink-0 px-3 py-1.5 min-h-[36px] flex items-center justify-center rounded-md bg-surface border border-border text-xs font-semibold text-ink hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            View Details
          </a>
        </div>
      )}
    </div>
  );
};
