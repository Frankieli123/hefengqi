import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import type { HomeHeroSlideView } from "@/types/home-hero";

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children, ...props }: React.ComponentProps<"a">) => <a href={String(href)} {...props}>{children}</a> }));

const labels = { previous: "Previous slide", next: "Next slide", slide: "Homepage highlights" };
const image = { src: "/media/aa/hash-1200.webp", width: 1920, height: 1080, focusX: 70, focusY: 50 };
const slides: HomeHeroSlideView[] = [
  { id: "one", key: "home-hero-1", contentDirection: "ltr", eyebrow: "First eyebrow", title: "First title", summary: "First summary for the carousel.", primary: { label: "Products", href: "/products" }, imageAlt: "First abstract scene", desktop: image },
  { id: "two", key: "home-hero-2", contentDirection: "ltr", eyebrow: "Second eyebrow", title: "Second title", summary: "Second summary for the carousel.", primary: { label: "Solutions", href: "/solutions" }, imageAlt: "Second abstract scene", desktop: { ...image, avif: "/media/aa/hash-1920.avif", webp: "/media/aa/hash-1920.webp", jpeg: "/media/aa/hash-1920.jpg" }, mobile: { ...image, avif: "/media/aa/hash-750.avif", webp: "/media/aa/hash-750.webp", jpeg: "/media/aa/hash-750.jpg" } },
];

let reduceMotion = false;
let mobileViewport = false;

beforeEach(() => {
  vi.useFakeTimers();
  reduceMotion = false;
  mobileViewport = false;
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockImplementation((query: string) => ({ matches: query.includes("prefers-reduced-motion") ? reduceMotion : query.includes("max-width: 767px") ? mobileViewport : false, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })) });
  Object.defineProperty(window.HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(window.HTMLCanvasElement.prototype, "toDataURL", { configurable: true, value: vi.fn().mockReturnValue("data:image/png;base64,fallback") });
});

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function finishPreload() {
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
}

describe("HomeHeroCarousel", () => {
  it("preloads the next slide with native image format and viewport selection", async () => {
    const links: HTMLLinkElement[] = [];
    const append = vi.spyOn(document.head, "appendChild").mockImplementation((node) => { if (node instanceof HTMLLinkElement) links.push(node); return node; });
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await finishPreload();
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("rel", "preload");
    expect(links[0]).toHaveAttribute("as", "image");
    expect(links[0]).toHaveAttribute("type", "image/avif");
    expect(links[0]).toHaveAttribute("imagesrcset", "/media/aa/hash-1920.avif");
    expect(links[0]).toHaveAttribute("imagesizes", "100vw");
    append.mockRestore();
  });

  it("keeps autoplay available without waiting for a preloaded image", async () => {
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
  });

  it("renders nothing when no valid slides are provided", () => {
    const { container } = render(<HomeHeroCarousel slides={[]} labels={labels} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single slide without autoplay controls", () => {
    const { container } = render(<HomeHeroCarousel slides={slides.slice(0, 1)} labels={labels} />);
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    expect(container.querySelector(".home-hero-copy")).toHaveAttribute("dir", "ltr");
    expect(screen.queryByRole("button", { name: "Next slide" })).not.toBeInTheDocument();
  });

  it("advances after three seconds and supports manual navigation", async () => {
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    expect(screen.queryByRole("button", { name: /Pause|Resume/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Homepage highlights 1: First eyebrow" })).toHaveAttribute("aria-current", "true");
    await finishPreload();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_990); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Homepage highlights 2: Second eyebrow" })).toHaveAttribute("aria-current", "true");
    expect(screen.getAllByRole("button", { name: /Homepage highlights \d:/ })[0]).toHaveAccessibleName("Homepage highlights 2: Second eyebrow");
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
  });

  it("keeps the current caption in the first slot and preserves keyboard focus during rapid switches", () => {
    const { container } = render(<HomeHeroCarousel slides={slides} labels={labels} />);
    const nextCaption = screen.getByRole("button", { name: "Homepage highlights 2: Second eyebrow" });
    const progress = container.querySelector(".home-hero-progress");
    act(() => nextCaption.focus());

    for (const current of ["Second eyebrow", "First eyebrow", "Second eyebrow"]) {
      fireEvent.click(nextCaption);
      const captions = screen.getAllByRole("button", { name: /Homepage highlights \d:/ });
      expect(captions[0]).toHaveAccessibleName(new RegExp(current));
      expect(captions[0]).toHaveAttribute("aria-current", "true");
      expect(captions[1]).not.toHaveAttribute("aria-current");
      expect(nextCaption).toHaveFocus();
      expect(container.querySelector(".home-hero-progress")).toBe(progress);
    }
  });

  it("resets the three-second countdown after manual and keyboard navigation", async () => {
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await finishPreload();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2_900); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("region", { name: "Homepage highlights" }), { key: "ArrowRight" });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_900); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
  });

  it("pauses while hovered and resumes with the remaining time", async () => {
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await finishPreload();
    const carousel = screen.getByRole("region", { name: "Homepage highlights" });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    fireEvent.mouseEnter(carousel);
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    fireEvent.mouseLeave(carousel);
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
  });

  it("pauses for focus within and resumes with the remaining time", async () => {
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await finishPreload();
    const next = screen.getByRole("button", { name: "Next slide" });
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    fireEvent.focus(next);
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    fireEvent.blur(next, { relatedTarget: null });
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
  });

  it("pauses while the document is hidden and resumes with the remaining time", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await finishPreload();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    hidden.mockRestore();
  });

  it("does not autoplay when reduced motion is requested", async () => {
    reduceMotion = true;
    render(<HomeHeroCarousel slides={slides} labels={labels} />);
    await finishPreload();
    await act(async () => { await vi.advanceTimersByTimeAsync(12_000); });
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
  });

  it("supports horizontal pointer gestures on mobile and desktop without treating vertical scrolling as navigation", () => {
    const { container } = render(<HomeHeroCarousel slides={slides} labels={labels} />);
    const surface = container.querySelector(".home-hero-slides")!;
    vi.stubGlobal("PointerEvent", MouseEvent);
    Object.defineProperty(surface, "setPointerCapture", { configurable: true, value: vi.fn() });
    const pointer = (type: string, pointerId: number, clientX: number, clientY: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0 });
      Object.defineProperties(event, { pointerId: { value: pointerId }, isPrimary: { value: true } });
      fireEvent(surface, event);
    };
    const down = (pointerId: number, clientX: number, clientY: number) => pointer("pointerdown", pointerId, clientX, clientY);
    const move = (pointerId: number, clientX: number, clientY: number) => pointer("pointermove", pointerId, clientX, clientY);
    const up = (pointerId: number, clientX: number, clientY: number) => pointer("pointerup", pointerId, clientX, clientY);
    down(1, 300, 180);
    move(1, 220, 190);
    up(1, 220, 190);
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    down(2, 220, 180);
    move(2, 225, 80);
    up(2, 225, 80);
    expect(screen.getByRole("heading", { level: 2, name: "Second title" })).toBeVisible();
    down(3, 100, 180);
    move(3, 180, 175);
    up(3, 180, 175);
    expect(screen.getByRole("heading", { level: 1, name: "First title" })).toBeVisible();
  });
});
