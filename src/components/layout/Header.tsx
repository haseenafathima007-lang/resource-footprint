import React from "react";
import { Link } from "react-router-dom";
import { Droplets, Zap, User as UserIcon, LayoutDashboard, CalendarPlus, BookOpen, Target, Users } from "lucide-react";
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
          aria-label="Resource Footprint"
          className="flex items-center gap-2 text-ink font-bold text-sm sm:text-xl tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md min-h-[44px] min-w-[44px]"
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
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            to="/methodology"
            className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Methodology</span>
          </Link>

          <ThemeToggle />

          {user ? (
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="User navigation">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LayoutDashboard className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">Dashboard</span>
              </Link>
              <Link
                to="/goals"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Target className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">Goals</span>
              </Link>
              <Link
                to="/log"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <CalendarPlus className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">Log</span>
              </Link>
              <Link
                to="/teams"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">Teams</span>
              </Link>
              <Link
                to="/account"
                aria-label="Account Settings"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserIcon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">Account</span>
              </Link>
            </nav>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center justify-center px-3 sm:px-4 min-h-[44px] min-w-[44px] text-xs sm:text-sm font-semibold rounded-lg bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
