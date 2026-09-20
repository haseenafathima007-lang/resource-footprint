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
    factorsVersion: "1.0.0",
    householdSize: 1,
    showerMinutesPerDay: 10,
    showerHeater: "electric",
    acHoursPerDay: 4,
    fanHoursPerDay: 6,
    laptopHoursPerDay: 6,
    laundryLoadsPerWeek: 4,
    laundryMachine: "topLoad",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: null,
    });
  });

  it("renders with default values in unchanged state showing friendly empty guidance", () => {
    render(<Simulator />);

    expect(
      screen.getByText("Move a slider to see the difference")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No habit changes selected yet. Move a slider to see your potential savings.")
    ).toBeInTheDocument();
  });

  it("reducing AC by 1 hour shows positive savings and exact expected numbers", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // Baseline is 4 hours, reduce to 3 hours
    fireEvent.change(acInput, { target: { value: "3" } });

    // Expect savings card to show positive savings
    await waitFor(() => {
      expect(screen.getByText("You could save per month:")).toBeInTheDocument();
    });

    // 1 hour reduction * 1.3 kW * 30 days = 39 kWh/month
    await waitFor(() => {
      expect(screen.getByText("~39")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Cutting AC by 1 hour a day could save about 39 kWh of energy a month.")
    ).toBeInTheDocument();
  });

  it("increasing AC by 2 hours shows neutral 'more' wording with icon and exact string", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // Baseline is 4 hours, increase to 6 hours
    fireEvent.change(acInput, { target: { value: "6" } });

    await waitFor(() => {
      expect(
        screen.getByText("This scenario would use more resources per month:")
      ).toBeInTheDocument();
    });

    // 2 hours increase * 1.3 kW * 30 days = 78 kWh/month
    await waitFor(() => {
      expect(screen.getByText("+78")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Increasing AC by 2 hours a day would use about 78 kWh of energy more a month.")
    ).toBeInTheDocument();
  });

  it("handles mixed cases: shower 10->0 with AC 4->10 (water down, energy up)", async () => {
    render(<Simulator />);

    /**
     * Hand-computed arithmetic for mixed case:
     * Baseline:
     *   householdSize = 1
     *   showerMinutes = 10, heater = 'electric'
     *   acHours = 4 (typical factor 1.3 kW)
     * Scenario:
     *   showerMinutes = 0
     *   acHours = 10
     *
     * 1. Water savings:
     *    shower.flow typical = 9.0 L/min (range: 6.0 – 12.0)
     *    Daily water saving = (10 - 0) * 9.0 = 90.0 L/day
     *    Monthly water saving (30 days) = 90.0 * 30 = 2,700 L/month
     *
     * 2. Energy changes:
     *    Shower heating saving = 90.0 L/day * 0.029 kWh/L = 2.610 kWh/day
     *    AC energy increase = (10 - 4) hours/day * 1.3 kW = 7.800 kWh/day
     *    Net energy change (Before - After) = 2.610 - 7.800 = -5.190 kWh/day (Net Increase)
     *    Monthly energy increase = 5.190 * 30 = 155.7 kWh/month -> 2 sig figs: 160 kWh/month
     */
    const showerInput = screen.getByLabelText(/daily shower time numeric input/i);
    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);

    fireEvent.change(showerInput, { target: { value: "0" } });
    fireEvent.change(acInput, { target: { value: "10" } });

    await waitFor(() => {
      expect(
        screen.getByText("Projected resource changes per month:")
      ).toBeInTheDocument();
    });

    // Water is saving: ~2,700 Litres (waiting for smooth animation)
    await waitFor(() => {
      expect(screen.getByText("~2,700")).toBeInTheDocument();
      expect(screen.getByText("+160")).toBeInTheDocument();
    });

    expect(screen.getByText("Water Savings")).toBeInTheDocument();
    expect(screen.getByText("Energy Usage")).toBeInTheDocument();
  });

  it("handles AC-only reduction by hiding unchanged water resource", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    fireEvent.change(acInput, { target: { value: "2" } }); // -2 hours AC

    await waitFor(() => {
      expect(screen.getByText("You could save per month:")).toBeInTheDocument();
    });

    // Energy is shown
    expect(screen.getByText("Energy Savings")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("~78")).toBeInTheDocument();
    });

    // Water is unchanged and MUST be hidden (no "~0" displayed)
    expect(screen.queryByText("Water Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Water Usage")).not.toBeInTheDocument();
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

    // Water is shown (5 min * 9 L * 30 days = 1,350 L -> 2 sig figs: ~1,400 L)
    expect(screen.getByText("Water Savings")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("~1,400")).toBeInTheDocument();
    });

    // Energy is unchanged and MUST be hidden (no "~0" displayed)
    expect(screen.queryByText("Energy Savings")).not.toBeInTheDocument();
    expect(screen.queryByText("Energy Usage")).not.toBeInTheDocument();
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

    // Verify baseline AC field does NOT display this error (error state is strictly separated)
    const baselineAcSection = screen.getByLabelText(/ac run time/i);
    expect(baselineAcSection).not.toHaveAttribute("aria-invalid", "true");
  });

  it("allows clearing input while editing without crashing or passing invalid numbers to engine", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // User clears the text box
    fireEvent.change(acInput, { target: { value: "" } });

    // Shows value is required
    await waitFor(() => {
      expect(screen.getByText("Value is required")).toBeInTheDocument();
    });

    // Now types a valid number
    fireEvent.change(acInput, { target: { value: "3" } });

    await waitFor(() => {
      expect(screen.queryByText("Value is required")).not.toBeInTheDocument();
      expect(screen.getByText("~39")).toBeInTheDocument();
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

    // Remains on default 10 minutes shower, 4 hours AC
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
});
