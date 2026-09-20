import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Sliders,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Simulator } from "@/components/simulator/Simulator.tsx";
import { FactorTable } from "@/components/methodology/FactorTable.tsx";
import factorsData from "@/data/factors.v1.json";

export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Resource Footprint — Personal Water & Energy Habit Simulator";
  }, []);

  return (
    <div className="flex flex-col gap-12 sm:gap-16 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* 1. HERO SECTION */}
      <section className="text-center flex flex-col items-center gap-4 max-w-3xl mx-auto pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold self-center border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Interactive Resource Estimator</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight sm:leading-tight">
          See what your daily habits{" "}
          <span className="text-primary underline decoration-primary/30 decoration-wavy decoration-2">
            really cost
          </span>
        </h1>

        <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
          No sign-up required. Adjust everyday habits to explore tangible water and
          energy footprints in litres and kilowatt-hours, with estimated ranges from average values still being verified against published sources.
        </p>
      </section>

      {/* 2. THE HERO FEATURE: WHAT-IF SIMULATOR */}
      <Simulator />

      {/* 3. HOW IT WORKS / VALUE PROPOSITION */}
      <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-6 pt-4">
        <div className="text-center max-w-xl mx-auto">
          <h2 id="how-it-works-heading" className="text-xl sm:text-2xl font-bold text-ink">
            How Resource Footprint Works
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            Grounded in physics, open calculation formulas, and radical transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface-raised border border-border flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Define Your Baseline</span>
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Start with your typical habits: shower routine, air conditioning, ceiling fans, and laundry frequency.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-raised border border-border flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" aria-hidden="true" />
              <span>Simulate Real Scenarios</span>
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Tweak one or more sliders to test practical changes: 5 fewer shower minutes, or 2 fewer AC hours per day.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-raised border border-border flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-positive/10 text-positive flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-positive" aria-hidden="true" />
              <span>Tangible Real Savings</span>
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              See projected monthly savings in tangible metrics (litres and kWh), scaled to real household reference baselines.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HONEST NUMBERS & FACTORS DISCLOSURE */}
      <section aria-labelledby="honest-numbers-heading" className="p-6 sm:p-8 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-accent shrink-0 mt-1">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="honest-numbers-heading" className="text-xl sm:text-2xl font-bold text-ink">
              Honest Numbers: Estimates, Not Measurements
            </h2>
            <p className="text-sm text-ink-muted mt-1 leading-relaxed">
              We never present false precision. Every calculation provides an estimated range (low, typical, high).
              Results are estimated ranges from average values still being verified against published sources.
            </p>
          </div>
        </div>

        {/* Collapsible Factor Reference Table */}
        <details className="group border border-border rounded-xl bg-surface-subtle overflow-hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-semibold text-ink hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span>View All Conversion Factors (v{factorsData.version})</span>
            <ChevronDown className="w-4 h-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="p-4 pt-0">
            <FactorTable />
          </div>
        </details>
      </section>

      {/* 5. CALL TO ACTION FOR LATER PHASES */}
      <section className="p-8 sm:p-10 rounded-3xl bg-primary text-on-primary text-center flex flex-col items-center gap-4 shadow-md">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-primary">
          Ready to track your actual consumption?
        </h2>
        <p className="text-on-primary/90 max-w-xl text-sm sm:text-base">
          Sign up to log daily habits, record deviations, and track your progress over time with personalized insights.
        </p>
        <Link
          to="/auth"
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-surface-raised text-ink font-bold text-sm sm:text-base hover:bg-surface transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Create Free Account
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
};
