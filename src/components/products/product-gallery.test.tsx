import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductGallery } from "@/components/products/product-gallery";

const images = [
  { src: "/media/front.webp", alt: "Front view", width: 800, height: 800 },
  { src: "/media/side.webp", alt: "Side view", width: 800, height: 800 },
  { src: "/media/back.webp", alt: "Back view", width: 800, height: 800 },
];

const extraImages = Array.from({ length: 4 }, (_, index) => ({
  src: `/media/extra-${index + 1}.webp`,
  alt: `Extra view ${index + 1}`,
  width: 800,
  height: 800,
}));

describe("ProductGallery", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders every image as a thumbnail and switches the square main image", () => {
    const { container } = render(<ProductGallery images={images} model="MODEL-1" />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("img", { name: "Front view" })).toBeInTheDocument();
    expect(container.querySelector(".aspect-square")).toBeInTheDocument();

    // Hover switching without needing to click
    fireEvent.mouseEnter(screen.getByRole("button", { name: /2 \/ 3/ }));
    expect(screen.getByRole("img", { name: "Side view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2 \/ 3/ })).toHaveAttribute("aria-current", "true");

    // Can also click or hover to third
    fireEvent.click(screen.getByRole("button", { name: /3 \/ 3/ }));
    expect(screen.getByRole("img", { name: "Back view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3 \/ 3/ })).toHaveAttribute("aria-current", "true");
  });

  it("limits the visible gallery to five images", () => {
    render(<ProductGallery images={[...images, ...extraImages]} model="MODEL-1" />);

    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.queryByRole("button", { name: /Extra view 3/ })).not.toBeInTheDocument();
  });

  it("shows flyout magnifier and aiming lens on hover, and hides on mouse leave", () => {
    const { container } = render(<ProductGallery images={images} model="MODEL-1" />);
    const zoomWrapper = container.querySelector(".cursor-crosshair") as HTMLElement;
    expect(zoomWrapper).toBeInTheDocument();
    expect(screen.queryByTestId("magnifier-lens")).not.toBeInTheDocument();
    expect(screen.queryByTestId("magnifier-flyout")).not.toBeInTheDocument();

    expect(zoomWrapper).toHaveClass("rounded-none");
    fireEvent.mouseEnter(zoomWrapper, { clientX: 200, clientY: 200 });
    const lens = screen.getByTestId("magnifier-lens");
    const flyout = screen.getByTestId("magnifier-flyout");
    expect(lens).toBeInTheDocument();
    expect(lens).toHaveClass("rounded-none");
    expect(flyout).toBeInTheDocument();
    expect(flyout).toHaveClass("rounded-none");
    expect(flyout).toHaveStyle({ width: "400px", height: "400px" });
    expect(flyout).not.toHaveClass("border-l-0");
    expect(flyout).toHaveClass("border");

    fireEvent.mouseLeave(zoomWrapper);
    expect(screen.queryByTestId("magnifier-lens")).not.toBeInTheDocument();
    expect(screen.queryByTestId("magnifier-flyout")).not.toBeInTheDocument();
  });

  it("suppresses lens right border when reaching the right edge to avoid double border with flyout", () => {
    const { container } = render(<ProductGallery images={images} model="MODEL-1" />);
    const zoomWrapper = container.querySelector(".cursor-crosshair") as HTMLElement;
    zoomWrapper.getBoundingClientRect = () => ({
      width: 480,
      height: 480,
      top: 0,
      left: 0,
      bottom: 480,
      right: 480,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(zoomWrapper, { clientX: 470, clientY: 240 });
    const lens = screen.getByTestId("magnifier-lens");
    expect(lens).toHaveClass("border-r-0");

    fireEvent.mouseMove(zoomWrapper, { clientX: 240, clientY: 240 });
    expect(lens).not.toHaveClass("border-r-0");
  });
});
