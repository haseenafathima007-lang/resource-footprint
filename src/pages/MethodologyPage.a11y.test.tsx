import "vitest-axe/extend-expect";
import type { AxeMatchers } from "vitest-axe";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import { MethodologyPage } from "./MethodologyPage.tsx";

expect.extend(matchers);

describe("MethodologyPage Accessibility (a11y)", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
  });

  it("has no axe accessibility violations in LIGHT mode", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/methodology"]}>
        <MethodologyPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /how we calculate your resource footprint/i })).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no axe accessibility violations in DARK mode", async () => {
    document.documentElement.classList.add("dark");

    const { container } = render(
      <MemoryRouter initialEntries={["/methodology"]}>
        <MethodologyPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /how we calculate your resource footprint/i })).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
