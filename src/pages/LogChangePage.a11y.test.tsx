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
import { LogChangePage } from "./LogChangePage.tsx";
import { baselineRepository } from "@/services/supabase/baselineRepository.ts";
import { deviationRepository } from "@/services/supabase/deviationRepository.ts";
import factorsData from "@/data/factors.v1.json";
import type { BaselineProfile, Deviation } from "@/engine";

expect.extend(matchers);

const mockBaseline: BaselineProfile = {
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

const mockDeviation: Deviation = {
  id: "dev-1",
  startDate: "2026-07-01",
  endDate: "2026-07-05",
  field: "acHoursPerDay",
  mode: "delta",
  value: 3,
  note: "Summer heatwave",
  groupId: "group-100",
  createdAt: "2026-07-01T00:00:00Z",
};

vi.mock("@/services/supabase/baselineRepository.ts", () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

vi.mock("@/services/supabase/deviationRepository.ts", () => ({
  deviationRepository: {
    list: vi.fn(),
    addMany: vi.fn(),
    delete: vi.fn(),
    removeGroup: vi.fn(),
  },
}));

describe("LogChangePage Accessibility (a11y)", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({
      ok: true,
      data: mockBaseline,
    });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({
      ok: true,
      data: [mockBaseline],
    });
    vi.mocked(deviationRepository.list).mockResolvedValue({
      ok: true,
      data: [mockDeviation],
    });
  });

  it("has no axe accessibility violations in LIGHT mode", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/log"]}>
        <LogChangePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /log a temporary change/i })).toBeDefined();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe accessibility violations in DARK mode", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(
      <MemoryRouter initialEntries={["/log"]}>
        <LogChangePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /log a temporary change/i })).toBeDefined();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
