import React from "react";
import { Info } from "lucide-react";

interface TrustBannerProps {
  show: boolean;
}

export const TrustBanner: React.FC<TrustBannerProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div
      role="note"
      aria-label="Factor verification notice"
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-surface-subtle border border-border text-xs text-ink-muted my-2"
    >
      <Info className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
      <span>Estimates use placeholder averages that are still being verified.</span>
    </div>
  );
};
