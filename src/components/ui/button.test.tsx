import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("supports an anchor render without native button warnings", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<Button render={<a href="/docs" />}>Documentation</Button>);

    expect(screen.getByText("Documentation").closest("a")).toHaveAttribute("href", "/docs");
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
