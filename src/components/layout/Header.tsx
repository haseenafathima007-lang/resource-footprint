import React from "react";
import { Link } from "react-router-dom";
import { Droplets, Zap, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Wordmark */}
        <Link
          to="/"
          aria-label="Resource Footprint"
          className="flex items-center gap-2 text-ink font-bold text-base sm:text-xl tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md min-h-[44px] min-w-[44px]"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <div className="relative">
              <Droplets className="w-5 h-5 text-water" />
              <Zap className="w-3 h-3 text-energy absolute -bottom-0.5 -right-0.5" aria-hidden="true" />
            </div>
          </div>
          <span className="sr-only sm:not-sr-only sm:inline font-bold">Resource Footprint</span>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <ThemeToggle />

          {user ? (
            <Link
              to="/account"
              className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <UserIcon className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Account</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center justify-center px-4 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
