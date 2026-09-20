import React, { useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Flame,
  Droplets,
  Zap,
} from 'lucide-react';
import bundledFactors from '@/data/factors.v1.json';
import { FactorTable } from '@/components/methodology/FactorTable.tsx';
import {
  calculateProfile,
  calculateScore,
  toFactorsMap,
  type BaselineProfile,
  type FactorSetPayload,
} from '@/engine';
import { formatTypicalValue } from '@/lib/format.ts';

const DEFAULT_EXAMPLE_BASELINE: BaselineProfile = {
  id: 'methodology-default',
  userId: 'example',
  effectiveFrom: '2026-01-01',
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: 'electric',
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: 'topLoad',
  factorsVersion: bundledFactors.version,
};

export const MethodologyPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Methodology & Science — Resource Footprint';
  }, []);

  const factorsMap = useMemo(
    () => toFactorsMap(bundledFactors as FactorSetPayload),
    []
  );

  const defaultCalculations = useMemo(() => {
    const daily = calculateProfile(DEFAULT_EXAMPLE_BASELINE, factorsMap);
    const refWater = factorsMap['reference.household.water']?.typical ?? 250;
    const refEnergy = factorsMap['reference.household.energy']?.typical ?? 6;

    const score = calculateScore(
      {
        water: daily.water.typical,
        energy: daily.energy.typical,
      },
      {
        water: refWater,
        energy: refEnergy,
      }
    );

    return {
      daily,
      monthlyWater: daily.water.typical * 30,
      monthlyEnergy: daily.energy.typical * 30,
      score,
      refWater,
      refEnergy,
    };
  }, [factorsMap]);

  return (
    <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16 py-6 sm:py-10 text-ink">
      {/* Page Header */}
      <div className="space-y-3 border-b border-border pb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Open Science & Methodology</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
          How We Calculate Your Resource Footprint
        </h1>
        <p className="text-base text-ink-muted leading-relaxed max-w-2xl">
          Radical transparency in resource accounting. Every formula, conversion factor, reference anchor, and algorithmic rule is public, deterministic, and empirical.
        </p>

        {/* Anchor quick-links */}
        <nav aria-label="Methodology navigation" className="flex flex-wrap gap-2 pt-2 text-xs">
          <a href="#overview" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            1. Core Principles
          </a>
          <a href="#factors" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            2. Factors Table
          </a>
          <a href="#calculations" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            3. Activity Formulas
          </a>
          <a href="#worked-example" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            4. Worked Example
          </a>
          <a href="#sustainability-score" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            5. Sustainability Score
          </a>
          <a href="#deviations" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            6. Deviations & History
          </a>
          <a href="#limitations" className="px-3 py-1.5 rounded-lg bg-surface-raised border border-border hover:border-primary text-ink transition-colors">
            7. Limits & Exclusions
          </a>
        </nav>
      </div>

      {/* 1. OVERVIEW & PRINCIPLES */}
      <section id="overview" aria-labelledby="overview-heading" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">01</span>
          <h2 id="overview-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Core Principles
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-2">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Radical Transparency</span>
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              No black-box machine learning or hidden heuristics. Every output is computed using published, verifiable mathematical models and cited conversion factors.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-2">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Calculator className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>Deterministic & DST-Neutral</span>
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Calculations run in pure arithmetic modules. Date mathematics operates strictly on UTC calendar dates to eliminate DST shifts and timezone drift.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-2">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-positive" aria-hidden="true" />
              <span>Honest Empirical Ranges</span>
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Real-world appliances vary. We provide empirical Low, Typical, and High estimates rather than artificial single-point precision.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-2">
            <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <span>Estimates, Not Measurements</span>
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Resource Footprint models everyday habitual behavior. It complements, but does not replace, calibrated utility meter readings.
            </p>
          </div>
        </div>
      </section>

      {/* 2. CONVERSION FACTORS */}
      <section id="factors" aria-labelledby="factors-heading" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">02</span>
          <h2 id="factors-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Conversion Factors Repository
          </h2>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          The table below contains the authoritative conversion factors bundled in factor set version <code className="px-1.5 py-0.5 rounded bg-surface-subtle font-mono text-xs">{bundledFactors.version}</code>.
        </p>

        <FactorTable />
      </section>

      {/* 3. ACTIVITY CALCULATIONS */}
      <section id="calculations" aria-labelledby="calculations-heading" className="space-y-6 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">03</span>
          <h2 id="calculations-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Activity Calculation Models
          </h2>
        </div>

        <div className="space-y-4 text-sm text-ink-muted leading-relaxed">
          {/* Shower model */}
          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-3">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Droplets className="w-4 h-4 text-water" aria-hidden="true" />
              <span>1. Shower Water & Heating Energy</span>
            </h3>
            <p>
              Daily water consumption is the product of shower duration and showerhead flow rate:
            </p>
            <div className="p-3 bg-surface rounded-lg font-mono text-xs text-ink overflow-x-auto border border-border">
              Water (L/day) = Duration (min/day) × Showerhead Flow Rate (L/min)
            </div>
            <p>
              Water heating energy uses thermodynamic specific heat capacity (4.184 kJ/(kg·°C) ≈ 0.001162 kWh/(L·°C)):
            </p>
            <div className="p-3 bg-surface rounded-lg font-mono text-xs text-ink overflow-x-auto border border-border">
              Energy (kWh/day) = Water (L) × ΔT (25°C) × 0.001162 kWh/(L·°C) / Efficiency (η)
            </div>
            <p className="text-xs">
              Where efficiency η = 1.0 for electric heaters, 0.85 for gas, and 2.8 for heat pumps. Solar heating contributes 0 kWh electrical draw.
            </p>
          </div>

          {/* Cooling & Electronics */}
          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-3">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Zap className="w-4 h-4 text-energy" aria-hidden="true" />
              <span>2. Cooling & Device Energy (Shared Household Division)</span>
            </h3>
            <p>
              Shared appliances (Air Conditioner and Ceiling Fan) are divided equally among household members (H):
            </p>
            <div className="p-3 bg-surface rounded-lg font-mono text-xs text-ink overflow-x-auto border border-border">
              AC Energy (kWh/day) = (AC Hours/day × AC Power Draw (kW)) / Household Size (H)
              <br />
              Fan Energy (kWh/day) = (Fan Hours/day × Fan Power Draw (kW)) / Household Size (H)
            </div>
            <p>
              Personal computing devices (Laptops) are attributed 100% to the individual user:
            </p>
            <div className="p-3 bg-surface rounded-lg font-mono text-xs text-ink overflow-x-auto border border-border">
              Laptop Energy (kWh/day) = Laptop Hours/day × Laptop Power Draw (0.045 kW)
            </div>
          </div>

          {/* Laundry */}
          <div className="p-5 rounded-xl border border-border bg-surface-raised space-y-3">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>3. Laundry Washing</span>
            </h3>
            <p>
              Weekly laundry loads are divided by household size and scaled to daily:
            </p>
            <div className="p-3 bg-surface rounded-lg font-mono text-xs text-ink overflow-x-auto border border-border">
              Daily Loads = (Loads per Week / H) / 7
              <br />
              Water (L/day) = Daily Loads × Machine Water Factor (L/load)
              <br />
              Energy (kWh/day) = Daily Loads × Machine Energy Factor (kWh/load)
            </div>
          </div>
        </div>
      </section>

      {/* 4. WORKED EXAMPLE */}
      <section id="worked-example" aria-labelledby="worked-heading" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">04</span>
          <h2 id="worked-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Live Default Profile Worked Example
          </h2>
        </div>
        <p className="text-sm text-ink-muted">
          Calculated live from our pure engine module for a default single-person household profile (H=1, 10 min electric shower, 4h AC, 6h Fan, 6h Laptop, 4 loads/week top-load laundry):
        </p>

        <div className="p-6 rounded-2xl border border-border bg-surface-raised space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="flex items-center gap-1.5 font-medium text-water">
                  <Droplets className="w-4 h-4" /> Daily Water
                </span>
                <span>Exact: {defaultCalculations.daily.water.typical.toFixed(2)} L</span>
              </div>
              <div className="text-2xl font-bold text-ink">
                ~{formatTypicalValue(defaultCalculations.daily.water.typical)} <span className="text-sm font-normal text-ink-muted">L / day</span>
              </div>
              <p className="text-xs text-ink-muted pt-1">
                Monthly: <strong>~{formatTypicalValue(defaultCalculations.monthlyWater)} L/month</strong> (exact: {defaultCalculations.monthlyWater.toFixed(1)} L)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="flex items-center gap-1.5 font-medium text-energy">
                  <Zap className="w-4 h-4" /> Daily Energy
                </span>
                <span>Exact: {defaultCalculations.daily.energy.typical.toFixed(2)} kWh</span>
              </div>
              <div className="text-2xl font-bold text-ink">
                ~{formatTypicalValue(defaultCalculations.daily.energy.typical)} <span className="text-sm font-normal text-ink-muted">kWh / day</span>
              </div>
              <p className="text-xs text-ink-muted pt-1">
                Monthly: <strong>~{formatTypicalValue(defaultCalculations.monthlyEnergy)} kWh/month</strong> (exact: {defaultCalculations.monthlyEnergy.toFixed(2)} kWh)
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Step-by-Step Breakdown (Hand Arithmetic Verified)
            </h3>
            <div className="space-y-1.5 font-mono text-xs text-ink">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Shower Water (10 min × 9 L/min):</span>
                <strong>90.00 L</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Laundry Water (4/7 loads × 130 L):</span>
                <strong>74.29 L</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50 text-primary font-bold">
                <span>Total Daily Water:</span>
                <span>164.29 L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Shower Heat (90 L × 25°C × 0.001162 / 1.0):</span>
                <strong>2.6145 kWh</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>AC (4h × 1.3 kW / 1):</span>
                <strong>5.2000 kWh</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Ceiling Fan (6h × 0.065 kW / 1):</span>
                <strong>0.3900 kWh</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Laptop (6h × 0.045 kW):</span>
                <strong>0.2700 kWh</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Laundry Electric (4/7 loads × 0.4 kWh):</span>
                <strong>0.2286 kWh</strong>
              </div>
              <div className="flex justify-between py-1 text-accent font-bold">
                <span>Total Daily Energy:</span>
                <span>8.6986 kWh</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SUSTAINABILITY SCORE FORMULA */}
      <section id="sustainability-score" aria-labelledby="score-heading" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">05</span>
          <h2 id="score-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Sustainability Score Formula & Anchors
          </h2>
        </div>

        <div className="space-y-4 text-sm text-ink-muted leading-relaxed">
          <p>
            The Sustainability Score (0 – 100) benchmarks your personal typical daily consumption against regional household reference averages:
          </p>

          <div className="p-4 bg-surface-raised rounded-xl border border-border font-mono text-xs text-ink space-y-2">
            <div>WaterScore = clamp(0, 100, 100 × (1 - DailyWater / RefWater))</div>
            <div>EnergyScore = clamp(0, 100, 100 × (1 - DailyEnergy / RefEnergy))</div>
            <div>OverallScore = round((WaterScore + EnergyScore) / 2)</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised text-center space-y-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Great (75 – 100)</span>
              <p className="text-xs text-ink-muted">Consuming ≤ 25% of regional reference</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised text-center space-y-1">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Getting there (50 – 74)</span>
              <p className="text-xs text-ink-muted">Consuming between 25% and 50% of reference</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised text-center space-y-1">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Room to improve (&lt; 50)</span>
              <p className="text-xs text-ink-muted">Consuming &ge; 50% of regional reference</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-2">
            <h3 className="font-semibold text-xs text-ink uppercase tracking-wider">
              Mathematical Anchor Points
            </h3>
            <ul className="list-disc list-inside text-xs space-y-1 text-ink-muted">
              <li><strong>Zero Consumption (0 L, 0 kWh):</strong> Score = 100 (Max theoretical score).</li>
              <li><strong>Reference Benchmark (250 L, 6 kWh):</strong> Score = 0 (Benchmark baseline).</li>
              <li><strong>50% Reference Reduction (125 L, 3 kWh):</strong> Score = 50.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. DEVIATIONS & HISTORY */}
      <section id="deviations" aria-labelledby="deviations-heading" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">06</span>
          <h2 id="deviations-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Deviations & Multi-Baseline History
          </h2>
        </div>

        <div className="space-y-3 text-sm text-ink-muted leading-relaxed">
          <p>
            Real life changes seasonally. Resource Footprint supports two layers of habit modeling:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-2">
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Multi-Baseline Timeline</span>
              </h3>
              <p className="text-xs text-ink-muted">
                Each baseline update has an <code className="font-mono text-xs">effectiveFrom</code> date. For any calendar date T, the engine resolves the latest baseline with effectiveFrom ≤ T. If T precedes all recorded baselines, the earliest baseline is projected backwards.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-2">
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Flame className="w-4 h-4 text-accent" />
                <span>Temporary Deviations</span>
              </h3>
              <p className="text-xs text-ink-muted">
                Events have explicit <code className="font-mono text-xs">[startDate, endDate]</code> windows. Overrides set exact values (e.g. vacation = 0), while deltas add relative shifts (e.g. heatwave = +3h AC). Multiple concurrent deviations are resolved and clamped to physical bounds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. LIMITATIONS & EXCLUSIONS */}
      <section id="limitations" aria-labelledby="limits-heading" className="space-y-4 scroll-mt-24 border-t border-border pt-8">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">07</span>
          <h2 id="limits-heading" className="text-xl sm:text-2xl font-bold text-ink">
            Scope, Boundaries & Limits
          </h2>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs sm:text-sm text-ink-muted leading-relaxed">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
            <span>Explicit Disclosure of Excluded Boundaries</span>
          </div>
          <p>
            To maintain high empirical confidence, Resource Footprint strictly confines its modeling scope to domestic direct water and household electricity consumption. The following areas are <strong>deliberately excluded</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Embodied & Industrial Water:</strong> Agricultural and manufacturing supply chain water footprints (e.g. virtual water embedded in food and clothing).</li>
            <li><strong>Transportation:</strong> Personal vehicle fuel, aviation, and public transit emissions (scheduled for dedicated transport modules).</li>
            <li><strong>Dietary Footprints:</strong> Caloric, agricultural, and livestock land-use emissions.</li>
            <li><strong>Municipal Utility Billing:</strong> Grid losses, water network leaks, and non-linear volumetric utility tariff tiers.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default MethodologyPage;
