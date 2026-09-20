import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { Simulator } from "./Simulator.tsx";
import { TrustBanner } from "./TrustBanner.tsx";
import { baselineRepository } from "@/services/supabase/baselineRepository.ts";
import * as authModule from "@/hooks/useAuth.tsx";
import type { BaselineProfile } from "@/engine";

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
      screen.getByText(/move a slider to see the difference/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no habit changes selected yet/i)
    ).toBeInTheDocument();
  });

  it("reducing AC by 1 hour shows positive savings and exact expected numbers", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // Baseline is 4 hours, reduce to 3 hours
    fireEvent.change(acInput, { target: { value: "3" } });

    // Expect savings card to show positive savings
    await waitFor(() => {
      expect(screen.getByText(/you could save per month:/i)).toBeInTheDocument();
    });

    // 1 hour reduction * 1.3 kW * 30 days = 39 kWh/month
    await waitFor(() => {
      expect(screen.getAllByText(/~39/).length).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByText(/cutting ac by 1 hour a day could save about 39 kwh of energy a month\./i).length
    ).toBeGreaterThan(0);
  });

  it("increasing AC by 2 hours shows neutral 'more' wording with icon", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // Baseline is 4 hours, increase to 6 hours
    fireEvent.change(acInput, { target: { value: "6" } });

    await waitFor(() => {
      expect(
        screen.getByText(/this scenario would use more resources per month:/i)
      ).toBeInTheDocument();
    });

    // 2 hours increase * 1.3 kW * 30 days = 78 kWh/month
    await waitFor(() => {
      expect(screen.getAllByText(/78/).length).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByText(/increasing ac by 2 hours a day would use about 78 kwh of energy more a month\./i).length
    ).toBeGreaterThan(0);
  });

  it("shows an inline error and does not crash on invalid input", async () => {
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    // Invalid input: 50 hours (max bound is 24)
    fireEvent.change(acInput, { target: { value: "50" } });

    await waitFor(() => {
      expect(
        screen.getAllByText(/ac hours per day must be between 0 and 24/i).length
      ).toBeGreaterThan(0);
    });
  });

  it("restores baseline values when 'Reset changes' is clicked", async () => {
    const user = userEvent.setup();
    render(<Simulator />);

    const acInput = screen.getByLabelText(/air conditioning \(ac\) numeric input/i);
    fireEvent.change(acInput, { target: { value: "2" } });

    await waitFor(() => {
      expect(screen.getByText(/you could save per month:/i)).toBeInTheDocument();
    });

    const resetButton = screen.getByRole("button", { name: /reset changes/i });
    expect(resetButton).toBeEnabled();
    await user.click(resetButton);

    await waitFor(() => {
      expect(
        screen.getByText(/move a slider to see the difference/i)
      ).toBeInTheDocument();
    });

    expect(acInput).toHaveValue(4);
  });

  it("prefills baseline habits for a signed-in user with an existing baseline", async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { id: "user-123", email: "user@example.com" } as any,
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
  });

  it("silently falls back to defaults if repository baseline fetch fails", async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { id: "user-123", email: "user@example.com" } as any,
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

describe("TrustBanner", () => {
  it("shows when unverified is true", () => {
    render(<TrustBanner show={true} />);
    expect(
      screen.getByText(/estimates use placeholder averages that are still being verified/i)
    ).toBeInTheDocument();
  });

  it("hides completely when all factors are verified (show is false)", () => {
    const { container } = render(<TrustBanner show={false} />);
    expect(container.firstChild).toBeNull();
  });
});
