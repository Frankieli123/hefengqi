import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicSelect } from "@/components/public-select";

describe("PublicSelect", () => {
  it("exposes a labelled, keyboard-ready trigger with its placeholder", () => {
    render(
      <PublicSelect
        id="product-category"
        aria-label="Product category"
        placeholder="Choose a category"
        required
        options={[
          { value: "power", label: "Power management" },
          { value: "optical", label: "Optical networking" },
        ]}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Product category" });
    expect(trigger).toHaveTextContent("Choose a category");
    expect(trigger).toHaveAttribute("aria-required", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
