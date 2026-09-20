import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Simulator } from "@/components/simulator/Simulator.tsx";
import factorsData from "@/data/factors.v1.json";
import {
  Sparkles,
  Sliders,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Resource Footprint — See what your daily habits really cost";
  }, []);

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* 1. HERO SECTION */}
      <section className="flex flex-col gap-4 text-center max-w-3xl mx-auto pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold self-center border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Interactive Water & Energy Simulator</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight">
          See what your daily habits really cost, and what a small change is worth.
        </h1>

        <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
          No sign-up required. Adjust everyday habits to explore tangible water and
          energy footprints in litres and kilowatt-hours, backed by empirical ranges.
        </p>
      </section>

      {/* 2. WHAT-IF SIMULATOR (THE HERO FEATURE) */}
      <Simulator />

      {/* 3. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-8 pt-8 border-t border-border">
        <div className="text-center max-w-2xl mx-auto">
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-bold text-ink">
            How It Works
          </h2>
          <p className="text-sm text-ink-muted mt-2">
            No tedious daily logging. Three simple steps to measure and reduce your personal impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Describe a typical day once</span>
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Set your household baseline for showers, AC, fan, laptop, and laundry. No repetitive logging fatigue.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-water/10 text-water flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-water" aria-hidden="true" />
              <span>See your water and energy</span>
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              View your footprint in real, tangible units — litres and kilowatt-hours — with realistic low to high ranges.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-energy/10 text-energy flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-energy" aria-hidden="true" />
              <span>Reduce with small changes</span>
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Move scenario sliders to discover how small daily adjustments add up to significant monthly and yearly savings.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HONEST NUMBERS & EMPIRICAL FACTORS DISCLOSURE */}
      <section aria-labelledby="honest-numbers-heading" className="p-6 sm:p-8 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-accent shrink-0 mt-1">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="honest-numbers-heading" className="text-xl font-bold text-ink">
              Honest Numbers: Estimates, Not Measurements
            </h2>
            <p className="text-sm text-ink-muted mt-1 leading-relaxed">
              We never present false precision. Every calculation provides an estimated range (low, typical, high)
              derived from published engineering benchmarks, verified laboratory studies, and public utility standards.
            </p>
          </div>
        </div>

        <details className="group border border-border rounded-xl overflow-hidden bg-surface-subtle">
          <summary className="px-4 py-3 text-sm font-semibold text-ink cursor-pointer hover:bg-surface flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span>See the factors we use ({factorsData.factors.length} conversion benchmarks)</span>
            <ChevronDown className="w-4 h-4 text-ink-muted group-open:rotate-180 transition-transform" aria-hidden="true" />
          </summary>

          <div className="p-4 overflow-x-auto border-t border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-ink-muted">
                  <th className="pb-2 font-semibold">Factor ID</th>
                  <th className="pb-2 font-semibold">Label</th>
                  <th className="pb-2 font-semibold">Unit</th>
                  <th className="pb-2 font-semibold">Typical (Low – High)</th>
                  <th className="pb-2 font-semibold">Empirical Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {factorsData.factors.map((f) => (
                  <tr key={f.id} className="hover:bg-surface/50">
                    <td className="py-2.5 font-mono text-[11px] text-ink-muted pr-2">{f.id}</td>
                    <td className="py-2.5 font-medium text-ink pr-2">{f.label}</td>
                    <td className="py-2.5 text-ink-muted pr-2 whitespace-nowrap">{f.unit}</td>
                    <td className="py-2.5 font-semibold text-ink pr-2 whitespace-nowrap">
                      {f.typical} ({f.low} – {f.high})
                    </td>
                    <td className="py-2.5 text-ink-muted max-w-xs">{f.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* 5. CALL TO ACTION SECTION */}
      <section className="p-8 sm:p-10 rounded-3xl bg-primary text-white text-center flex flex-col items-center gap-4 shadow-md">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Save your baseline to track progress
        </h2>
        <p className="max-w-xl text-white/90 text-sm sm:text-base leading-relaxed">
          Create a free account to persist your baseline habits and track deviations over time.
        </p>
        <Link
          to="/auth"
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary font-bold text-sm sm:text-base hover:bg-surface transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        >
          <span>Get Started Free</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
};
