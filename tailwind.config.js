/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "hsl(var(--color-surface) / <alpha-value>)",
          raised: "hsl(var(--color-surface-raised) / <alpha-value>)",
          subtle: "hsl(var(--color-surface-subtle) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "hsl(var(--color-text) / <alpha-value>)",
          muted: "hsl(var(--color-text-muted) / <alpha-value>)",
        },
        border: "hsl(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--color-primary) / <alpha-value>)",
          hover: "hsl(var(--color-primary-hover) / <alpha-value>)",
          on: "hsl(var(--color-on-primary) / <alpha-value>)",
        },
        "on-primary": "hsl(var(--color-on-primary) / <alpha-value>)",
        accent: "hsl(var(--color-accent) / <alpha-value>)",
        water: {
          DEFAULT: "hsl(var(--color-water) / <alpha-value>)",
          bg: "hsl(var(--color-water-bg) / <alpha-value>)",
        },
        energy: {
          DEFAULT: "hsl(var(--color-energy) / <alpha-value>)",
          bg: "hsl(var(--color-energy-bg) / <alpha-value>)",
        },
        positive: "hsl(var(--color-positive) / <alpha-value>)",
        negative: "hsl(var(--color-negative) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
