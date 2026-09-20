import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("theme");
        if (saved === "light" || saved === "dark" || saved === "system") {
          return saved;
        }
      }
    } catch {
      // localStorage may not be available in some contexts
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // ignore
    }
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const applyTheme = useCallback((targetTheme: Theme) => {
    const isDark =
      targetTheme === "dark" ||
      (targetTheme === "system" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
      setResolvedTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setResolvedTheme("light");
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme, applyTheme]);

  // Never persist theme to localStorage unless user explicitly chose it via toggle
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("theme", newTheme);
    } catch {
      // ignore
    }
  }, []);

  return { theme, setTheme, resolvedTheme };
}
