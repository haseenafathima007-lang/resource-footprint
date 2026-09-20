import "vitest-axe/extend-expect";
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import { LandingPage } from "./LandingPage.tsx";

expect.extend(matchers);

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
    getCurrentBaseline: vi.fn().mockResolvedValue({ ok: true, data: null }),
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
    resetPassword: vi.fn(),
  })),
}));

describe("LandingPage Accessibility (a11y)", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("has no axe accessibility violations in LIGHT mode", async () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe accessibility violations in DARK mode", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
