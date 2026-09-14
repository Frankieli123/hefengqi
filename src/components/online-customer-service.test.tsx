import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnlineCustomerService } from "@/components/online-customer-service";

const messages = [
  { id: "one", senderType: "ADMIN" as const, body: "Welcome to RICEWIND.", createdAt: "2026-09-14T08:00:00.000Z" },
  { id: "two", senderType: "ADMIN" as const, body: "How can I help?", createdAt: "2026-09-14T08:01:00.000Z" },
  { id: "three", senderType: "VISITOR" as const, body: "I need product information.", createdAt: "2026-09-14T08:02:00.000Z" },
];

describe("OnlineCustomerService", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
    window.localStorage.setItem("ricewind-customer-service:zh", JSON.stringify({ id: "conversation-1", token: "visitor-token" }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "conversation-1",
      status: "OPEN",
      operatorOnline: true,
      enabled: true,
      whatsapp: "8617621197907",
      offlineMessage: "离线",
      messages,
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("uses the RICEWIND identity, groups bubbles, and shows time only below the final message", async () => {
    const { container } = render(<OnlineCustomerService locale="zh" config={{ enabled: true, operatorOnline: true, whatsapp: "8617621197907", offlineMessage: "离线" }} />);

    const trigger = screen.getByRole("button", { name: "打开在线客服" });
    expect(trigger.querySelector(".customer-service-trigger-icon")).toBeInTheDocument();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("heading", { name: "RICEWIND" })).toBeInTheDocument());

    expect(container.querySelector(".customer-service-trigger")).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".customer-service.is-open")).toBeInTheDocument();
    expect(screen.getByText("在线")).toBeInTheDocument();
    expect(container.querySelector(".customer-service-brand-logo")).toHaveAttribute("src", expect.stringContaining("hefengqi-mark.png"));
    expect(container.querySelectorAll(".customer-service-message")).toHaveLength(3);
    expect(container.querySelectorAll(".customer-service-message-group.is-consecutive")).toHaveLength(1);
    expect(container.querySelectorAll(".customer-service-thread time")).toHaveLength(1);

    const form = container.querySelector(".customer-service-form");
    const whatsapp = screen.getByRole("link", { name: /WhatsApp 咨询/ });
    expect(form?.compareDocumentPosition(whatsapp) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("fits the mobile panel to the visual viewport when the keyboard is open", async () => {
    const viewport = new EventTarget() as EventTarget & { height: number; offsetTop: number };
    viewport.height = 420.2;
    viewport.offsetTop = 12.8;
    vi.stubGlobal("visualViewport", viewport);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 780 });

    const { container } = render(<OnlineCustomerService locale="zh" config={{ enabled: true, operatorOnline: true, whatsapp: "8617621197907", offlineMessage: "离线" }} />);
    fireEvent.click(screen.getByRole("button", { name: "打开在线客服" }));

    await waitFor(() => expect(container.querySelector(".customer-service-panel")).toBeInTheDocument());
    const panel = container.querySelector<HTMLElement>(".customer-service-panel");
    const input = screen.getByRole("textbox");
    await waitFor(() => expect(input).toBeEnabled());
    input.focus();
    expect(panel?.style.getPropertyValue("--customer-service-viewport-height")).toBe("421px");
    expect(panel?.style.getPropertyValue("--customer-service-viewport-top")).toBe("12px");
    expect(panel).toHaveAttribute("data-keyboard-open");
    expect(container.querySelector(".customer-service-channels")).toBeInTheDocument();
  });
});
