import React from "react";
import { Link } from "react-router-dom";
import { Droplets, Zap, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Brand Logo & Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-1.5 sm:gap-2 text-ink font-bold text-base sm:text-xl tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 min-w-0"
        >
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <div className="relative">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-water" />
              <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-energy absolute -bottom-0.5 -right-0.5" />
            </div>
          </div>
          <span className="hidden sm:inline">Resource Footprint</span>
          <span className="sm:hidden font-bold text-sm">Resource</span>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <ThemeToggle />

          {user ? (
            <Link
              to="/account"
              className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" aria-hidden="true" />
              <span>Account</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
