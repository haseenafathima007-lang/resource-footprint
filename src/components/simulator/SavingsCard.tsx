import React from "react";
import type { ActivityResult, Period } from "@/engine";
import { TrendingDown, TrendingUp, Sparkles, Droplets, Zap } from "lucide-react";
import { formatNumber, formatRange } from "@/lib/format.ts";
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

  const isSaving = waterTyp > 0.05 || energyTyp > 0.05;
  const isUsingMore = waterTyp < -0.05 || energyTyp < -0.05;
  const isUnchanged = !isSaving && !isUsingMore;

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

  if (isSaving) {
    return (
      <div className="p-5 sm:p-6 rounded-2xl bg-surface-raised border border-positive/30 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 text-positive font-bold text-base">
          <TrendingDown className="w-5 h-5" aria-hidden="true" />
          <span>You could save per {periodLabel}:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Water savings */}
          <div className="p-4 rounded-xl bg-water-bg border border-water/20 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-water uppercase tracking-wider">
              <Droplets className="w-4 h-4" aria-hidden="true" />
              <span>Water Savings</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                ~{formatNumber(animatedWater)}
              </span>
              <span className="text-sm font-semibold text-ink-muted">Litres</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Estimated range: {formatRange(scaledComparison.water.low, scaledComparison.water.high, "L")}
            </p>
          </div>

          {/* Energy savings */}
          <div className="p-4 rounded-xl bg-energy-bg border border-energy/20 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-energy uppercase tracking-wider">
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Energy Savings</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-ink">
                ~{formatNumber(animatedEnergy)}
              </span>
              <span className="text-sm font-semibold text-ink-muted">kWh</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Estimated range: {formatRange(scaledComparison.energy.low, scaledComparison.energy.high, "kWh")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Increased usage state (neutral wording with icon & text, never color alone)
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-raised border border-negative/30 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2 text-negative font-bold text-base">
        <TrendingUp className="w-5 h-5" aria-hidden="true" />
        <span>This scenario would use more resources per {periodLabel}:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Math.abs(waterTyp) > 0.05 && (
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-water">
              <Droplets className="w-4 h-4" aria-hidden="true" />
              <span>Additional Water</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-ink">
                +{formatNumber(animatedWater)}
              </span>
              <span className="text-sm text-ink-muted">L</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Range: {formatRange(Math.abs(scaledComparison.water.high), Math.abs(scaledComparison.water.low), "L")}
            </p>
          </div>
        )}

        {Math.abs(energyTyp) > 0.05 && (
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-energy">
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Additional Energy</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-ink">
                +{formatNumber(animatedEnergy)}
              </span>
              <span className="text-sm text-ink-muted">kWh</span>
            </div>
            <p className="text-xs text-ink-muted mt-1">
              Range: {formatRange(Math.abs(scaledComparison.energy.high), Math.abs(scaledComparison.energy.low), "kWh")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
