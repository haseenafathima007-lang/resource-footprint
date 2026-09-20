import "vitest-axe/extend-expect";
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import { DashboardPage } from "./DashboardPage.tsx";
import { baselineRepository } from "@/services/supabase/baselineRepository.ts";
import factorsData from "@/data/factors.v1.json";
import type { BaselineProfile } from "@/engine";

expect.extend(matchers);

// Mock Recharts ResponsiveContainer to render children in jsdom
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: 500, height: 300 }}>
        {children}
      </div>
    ),
  };
});

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const defaultProfile: BaselineProfile = {
  id: "b-1",
  userId: "user-1",
  effectiveFrom: "2026-01-01",
  factorsVersion: factorsData.version,
  householdSize: 1,
  showerMinutesPerDay: 10,
  showerHeater: "electric",
  acHoursPerDay: 4,
  fanHoursPerDay: 6,
  laptopHoursPerDay: 6,
  laundryLoadsPerWeek: 4,
  laundryMachine: "topLoad",
};

vi.mock("@/services/supabase/baselineRepository.ts", () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

describe("DashboardPage Accessibility (a11y)", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: defaultProfile,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [defaultProfile],
    });
  });

  it("has no axe accessibility violations in LIGHT mode", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /resource dashboard/i })).toBeDefined();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe accessibility violations in DARK mode", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /resource dashboard/i })).toBeDefined();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
