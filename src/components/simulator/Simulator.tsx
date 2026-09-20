import React from "react";
import { useSimulatorState } from "@/hooks/useSimulatorState.ts";
import { BaselinePanel } from "./BaselinePanel.tsx";
import { ScenarioPanel } from "./ScenarioPanel.tsx";
import { ResultsPanel } from "./ResultsPanel.tsx";

export const Simulator: React.FC = () => {
  const {
    baseline,
    scenario,
    period,
    errors,
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

  return (
    <div id="simulator" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      {/* Left Column: Interactive Habit Inputs (Baseline + Scenario) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <ScenarioPanel
          baseline={baseline}
          scenario={scenario}
          errors={errors}
          onUpdate={updateScenarioField}
          onReset={resetScenario}
        />

        <BaselinePanel
          baseline={baseline}
          errors={errors}
          onUpdate={updateBaselineField}
        />
      </div>

      {/* Right Column: Dynamic Real-Time Results & Impact */}
      <div className="lg:col-span-5 lg:sticky lg:top-20">
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
  );
};
