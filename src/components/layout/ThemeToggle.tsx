import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/hooks/useTheme.ts";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light theme", icon: Sun },
    { value: "dark", label: "Dark theme", icon: Moon },
    { value: "system", label: "System theme", icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex items-center p-1 rounded-lg bg-surface-subtle border border-border"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={`p-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
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
  );
};
