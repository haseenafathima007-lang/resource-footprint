import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/useTheme.ts";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", icon: Sun },
    { value: "dark", label: "Dark theme", icon: Moon },
    { value: "system", label: "System theme", icon: Monitor },
  ];

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const MobileIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div className="shrink-0">
      {/* Mobile single cycle button (>= 44x44px touch target) */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={cycleTheme}
          aria-label={`Current theme: ${theme}. Click to switch theme.`}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-border bg-surface-subtle text-ink hover:bg-surface-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MobileIcon className="w-5 h-5 text-primary" aria-hidden="true" />
        </button>
      </div>

      {/* Desktop 3-option radio group (>= 44x44px touch targets) */}
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="hidden sm:inline-flex items-center p-1 rounded-lg bg-surface-subtle border border-border"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={`min-w-[44px] min-h-[44px] px-2.5 flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
                isActive
                  ? "bg-surface-raised text-primary shadow-sm font-semibold"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
