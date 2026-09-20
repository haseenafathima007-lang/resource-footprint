import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Compass, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  useEffect(() => {
    document.title = "Page Not Found — Resource Footprint";
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24 max-w-md mx-auto gap-5">
      <div className="w-16 h-16 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-accent">
        <Compass className="w-8 h-8" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          The page you requested does not exist or has been moved. Head back to the simulator to explore your water and energy savings.
        </p>
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Simulator</span>
      </Link>
    </div>
  );
};
