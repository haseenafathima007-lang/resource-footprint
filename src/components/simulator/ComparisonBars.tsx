import React from "react";
import type { ActivityResult, Period } from "@/engine";
import { formatNumber, formatRange } from "@/lib/format.ts";
import { Droplets, Zap } from "lucide-react";

interface ComparisonBarsProps {
  scaledBaseline: ActivityResult;
  scaledScenario: ActivityResult;
  period: Period;
}

export const ComparisonBars: React.FC<ComparisonBarsProps> = ({
  scaledBaseline,
  scaledScenario,
  period,
}) => {
  const periodStr =
    period === "day"
      ? "day"
      : period === "week"
      ? "week"
      : period === "month"
      ? "month"
      : "year";

  // Water maximum for relative bar width
  const maxWater = Math.max(
    scaledBaseline.water.high,
    scaledScenario.water.high,
    1
  );
  const baselineWaterPct = Math.max(8, (scaledBaseline.water.typical / maxWater) * 100);
  const scenarioWaterPct = Math.max(8, (scaledScenario.water.typical / maxWater) * 100);

  // Energy maximum for relative bar width
  const maxEnergy = Math.max(
    scaledBaseline.energy.high,
    scaledScenario.energy.high,
    1
  );
  const baselineEnergyPct = Math.max(8, (scaledBaseline.energy.typical / maxEnergy) * 100);
  const scenarioEnergyPct = Math.max(8, (scaledScenario.energy.typical / maxEnergy) * 100);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-ink">
          Before vs. After Comparison
        </h3>
        <p className="text-xs text-ink-muted mt-0.5">
          Comparing typical consumption per {periodStr} (ranges shown in secondary text)
        </p>
      </div>

      {/* Screen-reader accessible equivalent */}
      <div className="sr-only">
        <h4>Screen Reader Summary of Footprint</h4>
        <p>
          Water: Baseline is typically {formatNumber(scaledBaseline.water.typical)} L (range {formatRange(scaledBaseline.water.low, scaledBaseline.water.high, "L")}).
          Scenario is typically {formatNumber(scaledScenario.water.typical)} L (range {formatRange(scaledScenario.water.low, scaledScenario.water.high, "L")}).
        </p>
        <p>
          Energy: Baseline is typically {formatNumber(scaledBaseline.energy.typical)} kWh (range {formatRange(scaledBaseline.energy.low, scaledBaseline.energy.high, "kWh")}).
          Scenario is typically {formatNumber(scaledScenario.energy.typical)} kWh (range {formatRange(scaledScenario.energy.low, scaledScenario.energy.high, "kWh")}).
        </p>
      </div>

      <div className="flex flex-col gap-6" aria-hidden="true">
        {/* 1. Water Bars */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-water">
            <span className="flex items-center gap-1.5">
              <Droplets className="w-4 h-4" />
              <span>Water Consumption</span>
            </span>
            <span className="text-ink-muted">Litres / {periodStr}</span>
          </div>

          {/* Baseline Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-ink">
              <span className="font-medium text-ink-muted">Before (Baseline)</span>
              <span className="font-bold">
                ~{formatNumber(scaledBaseline.water.typical)} L{" "}
                <span className="text-[11px] font-normal text-ink-muted">
                  ({formatRange(scaledBaseline.water.low, scaledBaseline.water.high, "L")})
                </span>
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-water/60 transition-all duration-300"
                style={{ width: `${baselineWaterPct}%` }}
              />
            </div>
          </div>

          {/* Scenario Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-ink">
              <span className="font-medium text-ink-muted">After (Scenario)</span>
              <span className="font-bold text-water">
                ~{formatNumber(scaledScenario.water.typical)} L{" "}
                <span className="text-[11px] font-normal text-ink-muted">
                  ({formatRange(scaledScenario.water.low, scaledScenario.water.high, "L")})
                </span>
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-water transition-all duration-300"
                style={{ width: `${scenarioWaterPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Energy Bars */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-energy">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Energy Consumption</span>
            </span>
            <span className="text-ink-muted">kWh / {periodStr}</span>
          </div>

          {/* Baseline Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-ink">
              <span className="font-medium text-ink-muted">Before (Baseline)</span>
              <span className="font-bold">
                ~{formatNumber(scaledBaseline.energy.typical)} kWh{" "}
                <span className="text-[11px] font-normal text-ink-muted">
                  ({formatRange(scaledBaseline.energy.low, scaledBaseline.energy.high, "kWh")})
                </span>
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-energy/60 transition-all duration-300"
                style={{ width: `${baselineEnergyPct}%` }}
              />
            </div>
          </div>

          {/* Scenario Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-ink">
              <span className="font-medium text-ink-muted">After (Scenario)</span>
              <span className="font-bold text-energy">
                ~{formatNumber(scaledScenario.energy.typical)} kWh{" "}
                <span className="text-[11px] font-normal text-ink-muted">
                  ({formatRange(scaledScenario.energy.low, scaledScenario.energy.high, "kWh")})
                </span>
              </span>
            </div>
            <div className="w-full h-4 rounded-full bg-surface-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-energy transition-all duration-300"
                style={{ width: `${scenarioEnergyPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
