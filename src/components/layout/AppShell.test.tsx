import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("loads the brand mark from a CSP-compatible local asset", () => {
    const { container } = render(
      <AppShell page="draft" onNavigate={() => undefined}>
        <div>Content</div>
      </AppShell>,
    );

    const logo = container.querySelector<HTMLImageElement>(".brand-mark img");
    expect(logo).toHaveAttribute("src", "/pickboard-mark.svg");
    expect(logo?.src.startsWith("data:")).toBe(false);
  });
});
