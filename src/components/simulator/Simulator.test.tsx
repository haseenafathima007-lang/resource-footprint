import React, { act } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Simulator } from "./Simulator.tsx";
import { TrustBanner } from "./TrustBanner.tsx";
import { checkAnyFactorUnverified } from "@/hooks/useSimulatorState.ts";
import { baselineRepository } from "@/services/supabase/baselineRepository.ts";
import * as authModule from "@/hooks/useAuth.tsx";
import type { BaselineProfile } from "@/engine";
import type { User } from "@supabase/supabase-js";

// Mock matchMedia so prefers-reduced-motion returns true, disabling animation in tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") || query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver mock to control simulator and results visibility
type IOChangeCallback = (entries: Array<{ isIntersecting: boolean }>) => void;
let ioCallbacks: Array<{ callback: IOChangeCallback; element: Element }> = [];

class MockIntersectionObserver {
  private cb: IOChangeCallback;
  constructor(callback: IOChangeCallback) {
    this.cb = callback;
  }
  observe(element: Element) {
    ioCallbacks.push({ callback: this.cb, element });
  }
  unobserve(element: Element) {
    ioCallbacks = ioCallbacks.filter((item) => item.element !== element);
  }
  disconnect() {
    ioCallbacks = [];
  }
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: MockIntersectionObserver,
});

vi.mock("@/services/supabase/baselineRepository.ts", () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth.tsx", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    session: null,
    profile: null,
    loading: false,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    signInWithMagicLink: vi.fn(),
    refreshProfile: vi.fn(),
    updateDisplayName: vi.fn(),
  })),
}));

describe("Simulator Component", () => {
  const defaultBaseline: BaselineProfile = {
    effectiveFrom: "2026-01-01",
    householdSize: 1,
    showerMinutesPerDay: 10,
    showerHeater: "electric",
    acHoursPerDay: 4,
    fanHoursPerDay: 6,
    laptopHoursPerDay: 6,
    laundryLoadsPerWeek: 4,
    laundryMachine: "topLoad",
    factorsVersion: "1.0.0",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ioCallbacks = [];
    window.history.replaceState(null, "", "/");
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signInWithMagicLink: vi.fn(),
      refreshProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    });
  });

  it("renders baseline habits, scenario controls, and summary results", () => {
    render(<Simulator />);

    expect(screen.getByRole("heading", { name: /your baseline habits/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /try a change/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /impact & savings/i })).toBeInTheDocument();
  });

  it("handles mixed changes correctly (shower 10->0 with AC 4->10)", async () => {
    /**
     * Hand-computed Arithmetic:
     * Baseline:
     *   householdSize = 2
     *   showerMinutesPerDay = 10, heater = 'electric'
     *   acHoursPerDay = 4
     * Scenario:
     *   showerMinutesPerDay = 0
     *   acHoursPerDay = 10
     * Period: month (30 days)
     *
     * Factors (from factors.v1.json):
     *   shower.flow typical = 9.0 L/min
     *   shower.heating typical = 0.029 kWh/L
     *   ac.power typical = 1.3 kW
     *
     * Water calculation:
     *   Daily water delta = (10 - 0) * 9.0 L/min = 90.0 L/day
     *   Monthly water saved = 90.0 * 30 days = 2,700 L/month
     *   Result: positive water delta (Water Savings) = ~2,700 Litres
     *
     * Energy calculation:
     *   Shower heating energy saved = 90.0 L/day * 0.029 kWh/L = 2.610 kWh/day
     *   AC energy increased = (10 - 4) hrs * 1.3 kW / 2 (householdSize) = 7.8 / 2 = 3.900 kWh/day
     *   Net daily energy delta = 2.610 (saved) - 3.900 (increased) = -1.290 kWh/day (net increase)
     *   Monthly net energy increase = 1.290 * 30 days = 38.7 kWh/month
     *   Rounded to 2 significant figures = 39 kWh/month
     *   Result: negative energy delta (Extra energy) = +160 kWh
     */
    render(<Simulator />);

    const showerInput = screen.getByLabelText(/daily shower time numeric input/i);
    fireEvent.change(showerInput, { target: { value: "0" } });

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    fireEvent.change(acInput, { target: { value: "10" } });

    await waitFor(() => {
      expect(
        screen.getByText("Projected resource changes per month:")
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("~2,700")).toBeInTheDocument();
      expect(screen.getByText("+160")).toBeInTheDocument();
    });

    expect(screen.getByText("Water Savings")).toBeInTheDocument();
    expect(screen.getByText("Extra energy")).toBeInTheDocument();
  });

  it("handles AC-only reduction by hiding unchanged water resource", async () => {
    /**
     * Arithmetic:
     * Baseline: AC = 4 hrs, householdSize = 2.
     * Scenario: AC = 2 hrs (-2 hrs).
     * Daily AC energy saved = 2 hrs * 1.3 kW / 1 (householdSize) = 2.6 kWh/day.
     * Monthly energy saved = 2.6 * 30 days = 78 kWh/month.
     */
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    fireEvent.change(acInput, { target: { value: "2" } }); // -2 hours AC

    await waitFor(() => {
      expect(screen.getByText("You could save per month:")).toBeInTheDocument();
    });

    expect(screen.getByText("Energy Savings")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("~78")).toBeInTheDocument();
    });

    // Water is unchanged and MUST be hidden (no "~0" displayed)
    expect(screen.queryByText("Water Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Extra water")).not.toBeInTheDocument();
    expect(screen.queryByText("~0")).not.toBeInTheDocument();
  });

  it("handles water-only change by hiding unchanged energy resource", async () => {
    render(<Simulator />);

    // First, set baseline shower heater to "none" so shower changes affect ONLY water
    const noHeaterBtn = screen.getByRole("radio", { name: /no heater \/ solar/i });
    fireEvent.click(noHeaterBtn);

    // Now reduce shower minutes in scenario from 10 to 5 minutes
    const showerInput = screen.getByLabelText(/daily shower time numeric input/i);
    fireEvent.change(showerInput, { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.getByText("You could save per month:")).toBeInTheDocument();
    });

    expect(screen.getByText("Water Savings")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("~1,400")).toBeInTheDocument();
    });

    // Energy is unchanged and MUST be hidden (no "~0" displayed)
    expect(screen.queryByText("Energy Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Extra energy")).not.toBeInTheDocument();
  });

  it("shows an inline error only under the control that caused it and asserts exact string", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // Invalid input: 50 hours (max bound is 24)
    fireEvent.change(acInput, { target: { value: "50" } });

    await waitFor(() => {
      expect(
        screen.getByText("AC hours per day must be between 0 and 24")
      ).toBeInTheDocument();
    });

    // Verify baseline AC field does NOT display this error
    const baselineAcSection = screen.getByLabelText(/ac run time/i);
    expect(baselineAcSection).not.toHaveAttribute("aria-invalid", "true");
  });

  it("types '2.5' into a field that held 4 and ends as 2.5", async () => {
    /**
     * Arithmetic:
     * Baseline: AC = 4 hrs, householdSize = 2.
     * Scenario: AC = 2.5 hrs (-1.5 hrs).
     * Daily AC energy saved = 1.5 hrs * 1.3 kW / 2 = 0.975 kWh/day.
     * Monthly energy saved = 0.975 * 30 days = 29.25 -> ~59 kWh/month.
     */
    const user = userEvent.setup();
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    expect(acInput).toHaveValue(4);

    await user.clear(acInput);
    await user.type(acInput, "2.5");

    expect(acInput).toHaveValue(2.5);
    await waitFor(() => {
      expect(screen.getByText("~59")).toBeInTheDocument();
    });
  });

  it("allows clearing then typing works, and out-of-range does not update results", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);

    // Set out of range atomically
    fireEvent.change(acInput, { target: { value: "30" } });
    expect(screen.getByText("AC hours per day must be between 0 and 24")).toBeInTheDocument();

    // Results panel does not calculate for 30 (still shows no change)
    expect(screen.queryByText("You could save per month:")).not.toBeInTheDocument();

    // Clear and set valid 3
    fireEvent.change(acInput, { target: { value: "3" } });
    expect(screen.queryByText("AC hours per day must be between 0 and 24")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("~39")).toBeInTheDocument();
    });
  });

  it("operates safely in React.StrictMode without state desync", async () => {
    render(
      <React.StrictMode>
        <Simulator />
      </React.StrictMode>
    );

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    fireEvent.change(acInput, { target: { value: "2" } });

    await waitFor(() => {
      expect(screen.getByText("~78")).toBeInTheDocument();
    });
  });

  it("controls sticky results bar visibility via IntersectionObserver", async () => {
    render(<Simulator />);

    // Initially simulator is in view and results is not: sticky bar is displayed
    expect(screen.getByRole("region", { name: /current estimate summary/i })).toBeInTheDocument();

    expect(ioCallbacks.length).toBe(2);
    const resultsCallback = ioCallbacks[1].callback;

    // Simulate user scrolling down so results panel enters viewport
    act(() => { resultsCallback([{ isIntersecting: true }]); });

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: /current estimate summary/i })).not.toBeInTheDocument();
    });

    // Simulate user scrolling back up so results panel exits viewport
    act(() => { resultsCallback([{ isIntersecting: false }]); });

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /current estimate summary/i })).toBeInTheDocument();
    });
  });

  it("restores baseline values when 'Reset changes' is clicked", async () => {
    const user = userEvent.setup();
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    fireEvent.change(acInput, { target: { value: "2" } });

    await waitFor(() => {
      expect(screen.getByText("You could save per month:")).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /reset changes/i });
    expect(resetButton).toBeEnabled();
    await user.click(resetButton);

    await waitFor(() => {
      expect(
        screen.getByText("Move a slider to see the difference")
      ).toBeInTheDocument();
    });

    expect(acInput).toHaveValue(4);
  });

  it("prefills baseline habits for a signed-in user without writing URL params on initial load", async () => {
    const mockUser = { id: "user-123", email: "user@example.com" } as unknown as User;
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: mockUser,
      session: null,
      profile: null,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signInWithMagicLink: vi.fn(),
      refreshProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    });

    const customUserBaseline: BaselineProfile = {
      ...defaultBaseline,
      showerMinutesPerDay: 15,
      acHoursPerDay: 6,
    };

    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: customUserBaseline,
    });

    render(<Simulator />);

    await waitFor(() => {
      const showerInput = screen.getByLabelText(/daily shower duration/i);
      expect(showerInput).toHaveValue(15);
      const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
      expect(acInput).toHaveValue(6);
    });

    // Verifies URL params were not written automatically on initial load
    expect(window.location.search).toBe("");
  });

  it("silently falls back to defaults if repository baseline fetch fails", async () => {
    const mockUser = { id: "user-123", email: "user@example.com" } as unknown as User;
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: mockUser,
      session: null,
      profile: null,
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signInWithMagicLink: vi.fn(),
      refreshProfile: vi.fn(),
      updateDisplayName: vi.fn(),
    });

    vi.mocked(baselineRepository.getCurrentBaseline).mockRejectedValue(
      new Error("Network disconnect")
    );

    render(<Simulator />);

    const showerInput = screen.getByLabelText(/daily shower duration/i);
    expect(showerInput).toHaveValue(10);
    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    expect(acInput).toHaveValue(4);
  });
});

describe("TrustBanner and Factor Verification Derivation", () => {
  it("derives unverified status when at least one factor is unverified", () => {
    const mixedFactors = [
      { id: "f1", verified: true },
      { id: "f2", verified: false },
    ];
    expect(checkAnyFactorUnverified(mixedFactors)).toBe(true);

    const omittedVerification = [
      { id: "f1", verified: true },
      { id: "f2" },
    ];
    expect(checkAnyFactorUnverified(omittedVerification)).toBe(true);
  });

  it("derives all-verified status when all factors have verified: true", () => {
    const verifiedFactors = [
      { id: "f1", verified: true },
      { id: "f2", verified: true },
    ];
    expect(checkAnyFactorUnverified(verifiedFactors)).toBe(false);
  });

  it("shows banner when unverified is true", () => {
    render(<TrustBanner show={true} />);
    expect(
      screen.getByText("Estimates use placeholder averages that are still being verified.")
    ).toBeInTheDocument();
  });

  it("hides banner completely when all factors are verified (show is false)", () => {
    const { container } = render(<TrustBanner show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("Simulator displays trust banner when factor set contains unverified factors", () => {
    render(<Simulator />);
    expect(
      screen.getByText("Estimates use placeholder averages that are still being verified.")
    ).toBeInTheDocument();
  });
});

describe("Simulator TrustBanner with all verified factors", () => {
  it("hides trust banner at the Simulator level when all factors are verified", async () => {
    vi.resetModules();
    const factorsDataOriginal = await import("@/data/factors.v1.json");
    const allVerifiedData = {
      ...factorsDataOriginal.default,
      factors: factorsDataOriginal.default.factors.map((f) => ({ ...f, verified: true })),
    };

    vi.doMock("@/data/factors.v1.json", () => ({
      default: allVerifiedData,
    }));

    const { Simulator: IsolatedSimulator } = await import("./Simulator.tsx");
    render(<IsolatedSimulator />);

    expect(
      screen.queryByText("Estimates use placeholder averages that are still being verified.")
    ).not.toBeInTheDocument();
  });
});
