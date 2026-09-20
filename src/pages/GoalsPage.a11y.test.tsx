import "vitest-axe/extend-expect";
import "@testing-library/jest-dom";
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
import { GoalsPage } from "./GoalsPage.tsx";
import { baselineRepository } from "@/services/supabase/baselineRepository.ts";
import { deviationRepository } from "@/services/supabase/deviationRepository.ts";
import { goalRepository } from "@/services/supabase/goalRepository.ts";
import { factorRepository } from "@/services/supabase/factorRepository.ts";
import factorsData from "@/data/factors.v1.json";
import type { BaselineProfile } from "@/engine";

expect.extend(matchers);

vi.mock("@/services/supabase/baselineRepository.ts", () => ({
  baselineRepository: {
    getCurrentBaseline: vi.fn(),
    getBaselineHistory: vi.fn(),
  },
}));

vi.mock("@/services/supabase/deviationRepository.ts", () => ({
  deviationRepository: {
    list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  },
}));

vi.mock("@/services/supabase/goalRepository.ts", () => ({
  goalRepository: {
    list: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    create: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/supabase/factorRepository.ts", () => ({
  factorRepository: {
    getFactorSet: vi.fn().mockImplementation(async () => {
      const data = await import("@/data/factors.v1.json");
      return { ok: true, data: data.default };
    }),
  },
}));

const mockProfile: BaselineProfile = {
  id: "b-1",
  userId: "user-1",
  effectiveFrom: "2026-01-01",
  factorsVersion: factorsData.version,
  householdSize: 2,
  showerMinutesPerDay: 10,
  showerHeater: "electric",
  acHoursPerDay: 4,
  fanHoursPerDay: 8,
  laptopHoursPerDay: 8,
  laundryLoadsPerWeek: 3,
  laundryMachine: "topLoad",
};

const fixedClock = () => new Date("2026-09-20T00:00:00.000Z");

describe("GoalsPage Accessibility (a11y)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(baselineRepository.getCurrentBaseline).mockResolvedValue({ ok: true, data: mockProfile });
    vi.mocked(baselineRepository.getBaselineHistory).mockResolvedValue({ ok: true, data: [mockProfile] });
    vi.mocked(deviationRepository.list).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(goalRepository.list).mockResolvedValue({ ok: true, data: [] });
    vi.mocked(factorRepository.getFactorSet).mockResolvedValue({ ok: true, data: factorsData as any });
  });

  it("has zero accessibility violations on render", async () => {
    const { container } = render(
      <MemoryRouter>
        <GoalsPage clock={fixedClock} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Resource Reduction Goals")).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
