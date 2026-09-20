import React from "react";
import type { ActivityResult, Period } from "@/engine";
import { TrendingDown, TrendingUp, Sparkles, Droplets, Zap } from "lucide-react";
import { formatRange, formatTypicalValue } from "@/lib/format.ts";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber.ts";

interface SavingsCardProps {
  scaledComparison: ActivityResult;
  period: Period;
}

export const SavingsCard: React.FC<SavingsCardProps> = ({
  scaledComparison,
  period,
}) => {
  const periodLabel =
    period === "day"
      ? "day"
      : period === "week"
      ? "week"
      : period === "month"
      ? "month"
      : "year";

  const waterTyp = scaledComparison.water.typical;
  const energyTyp = scaledComparison.energy.typical;

  // Animated typical numbers (< 400ms duration)
  const animatedWater = useAnimatedNumber(Math.abs(waterTyp));
  const animatedEnergy = useAnimatedNumber(Math.abs(energyTyp));

  // Determine independent resource status
  const waterStatus: "saving" | "increase" | "unchanged" =
    waterTyp > 0.05 ? "saving" : waterTyp < -0.05 ? "increase" : "unchanged";

  const energyStatus: "saving" | "increase" | "unchanged" =
    energyTyp > 0.05 ? "saving" : energyTyp < -0.05 ? "increase" : "unchanged";

  const isUnchanged = waterStatus === "unchanged" && energyStatus === "unchanged";

  if (isUnchanged) {
    return (
      <div className="p-5 rounded-2xl bg-surface-raised border border-border shadow-sm flex items-center gap-4 text-ink-muted">
        <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-accent" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-ink text-sm">Move a slider to see the difference</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Adjust any habit in the scenario panel to calculate your potential savings.
          </p>
        </div>
      </div>
    );
  }

  // Determine overall heading context
  const hasSavings = waterStatus === "saving" || energyStatus === "saving";
  const hasIncreases = waterStatus === "increase" || energyStatus === "increase";
  const isMixed = hasSavings && hasIncreases;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-4">
      {/* Dynamic contextual heading */}
      <div className="flex items-center gap-2 font-bold text-base">
        {isMixed ? (
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="w-5 h-5 text-accent" aria-hidden="true" />
            <span>Projected resource changes per {periodLabel}:</span>
          </div>
        ) : hasSavings ? (
          <div className="flex items-center gap-2 text-positive">
            <TrendingDown className="w-5 h-5" aria-hidden="true" />
            <span>You could save per {periodLabel}:</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-negative">
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
            <span>This scenario would use more resources per {periodLabel}:</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Water Resource: hidden if unchanged */}
        {waterStatus === "saving" && (
          <div className="p-4 rounded-xl bg-water-bg border border-water/30 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-water uppercase tracking-wider">
                <Droplets className="w-4 h-4" aria-hidden="true" />
                <span>Water Savings</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-positive bg-positive/10 border border-positive/20 px-2 py-0.5 rounded-full">
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
                <span>Saving</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                ~{formatTypicalValue(animatedWater)}
              </span>
              <span className="text-sm font-semibold text-ink-muted">Litres</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Estimated range: {formatRange(scaledComparison.water.low, scaledComparison.water.high, "L")}
            </p>
          </div>
        )}

        {waterStatus === "increase" && (
          <div className="p-4 rounded-xl bg-surface-subtle border border-negative/30 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-water uppercase tracking-wider">
                <Droplets className="w-4 h-4" aria-hidden="true" />
                <span>Water Usage</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-negative bg-negative/10 border border-negative/20 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                <span>Increase</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                +{formatTypicalValue(animatedWater)}
              </span>
              <span className="text-sm font-semibold text-ink-muted">Litres</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Estimated range: {formatRange(Math.abs(scaledComparison.water.high), Math.abs(scaledComparison.water.low), "L")}
            </p>
          </div>
        )}

        {/* Energy Resource: hidden if unchanged */}
        {energyStatus === "saving" && (
          <div className="p-4 rounded-xl bg-energy-bg border border-energy/30 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-energy uppercase tracking-wider">
                <Zap className="w-4 h-4" aria-hidden="true" />
                <span>Energy Savings</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-positive bg-positive/10 border border-positive/20 px-2 py-0.5 rounded-full">
                <TrendingDown className="w-3 h-3" aria-hidden="true" />
                <span>Saving</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                ~{formatTypicalValue(animatedEnergy)}
              </span>
              <span className="text-sm font-semibold text-ink-muted">kWh</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Estimated range: {formatRange(scaledComparison.energy.low, scaledComparison.energy.high, "kWh")}
            </p>
          </div>
        )}

        {energyStatus === "increase" && (
          <div className="p-4 rounded-xl bg-surface-subtle border border-negative/30 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-energy uppercase tracking-wider">
                <Zap className="w-4 h-4" aria-hidden="true" />
                <span>Energy Usage</span>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-negative bg-negative/10 border border-negative/20 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                <span>Increase</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                +{formatTypicalValue(animatedEnergy)}
              </span>
              <span className="text-sm font-semibold text-ink-muted">kWh</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Estimated range: {formatRange(Math.abs(scaledComparison.energy.high), Math.abs(scaledComparison.energy.low), "kWh")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
