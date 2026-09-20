import React from "react";
import factorsData from "@/data/factors.v1.json";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-surface-subtle py-8 px-4 sm:px-6 mt-16">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-sm text-ink-muted">
        <div>
          <p className="font-medium text-ink">Resource Footprint</p>
          <p className="mt-0.5">
            Measure, understand, and reduce your everyday water and energy consumption.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
          <span className="font-semibold text-ink px-2.5 py-1 rounded-full bg-surface-raised border border-border text-xs">
            Estimates, not measurements
          </span>
          <p className="text-xs text-ink-muted">
            Factor set v{factorsData.version} ({factorsData.region})
          </p>
        </div>
      </div>
    </footer>
  );
};
