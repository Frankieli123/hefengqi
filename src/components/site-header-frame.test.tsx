import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SiteHeaderFrame } from "@/components/site-header-frame";

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
  fireEvent.scroll(window);
}

describe("SiteHeaderFrame", () => {
  beforeEach(() => scrollTo(0));
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.siteHeader;
  });

  it("retracts while scrolling down and returns while scrolling up", () => {
    render(<SiteHeaderFrame><span>Navigation</span></SiteHeaderFrame>);
    const header = screen.getByRole("banner");

    act(() => scrollTo(80));
    expect(header).toHaveAttribute("data-scroll-state", "hidden");
    expect(document.documentElement).toHaveAttribute("data-site-header", "hidden");

    act(() => scrollTo(50));
    expect(header).toHaveAttribute("data-scroll-state", "scrolled");
    expect(document.documentElement).toHaveAttribute("data-site-header", "visible");
  });

  it("stays visible near the top and returns when keyboard focus enters", () => {
    render(<SiteHeaderFrame><button type="button">Navigation</button></SiteHeaderFrame>);
    const header = screen.getByRole("banner");

    act(() => scrollTo(18));
    expect(header).toHaveAttribute("data-scroll-state", "scrolled");
    act(() => scrollTo(90));
    expect(header).toHaveAttribute("data-scroll-state", "hidden");
    fireEvent.focus(screen.getByRole("button"));
    expect(header).toHaveAttribute("data-scroll-state", "scrolled");
  });
});
