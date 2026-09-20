import React from "react";
import { Link } from "react-router-dom";
import { Droplets, Zap, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

export const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2 text-ink font-bold text-lg sm:text-xl tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <div className="relative">
              <Droplets className="w-5 h-5 text-water" />
              <Zap className="w-3 h-3 text-energy absolute -bottom-1 -right-1" />
            </div>
          </div>
          <span>Resource Footprint</span>
        </Link>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />

          {user ? (
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface-raised hover:bg-surface-subtle text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <UserIcon className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Account</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
