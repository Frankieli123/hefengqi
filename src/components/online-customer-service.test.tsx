import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnlineCustomerService } from "@/components/online-customer-service";

const messages = [
  { id: "one", senderType: "ADMIN" as const, body: "Welcome to RICEWIND.", createdAt: "2026-09-14T08:00:00.000Z" },
  { id: "two", senderType: "ADMIN" as const, body: "How can I help?", createdAt: "2026-09-14T08:01:00.000Z" },
  { id: "three", senderType: "VISITOR" as const, body: "I need product information.", createdAt: "2026-09-14T08:02:00.000Z" },
];
const initialInnerHeight = window.innerHeight;
const initialInnerWidth = window.innerWidth;
const initialScrollX = window.scrollX;
const initialScrollY = window.scrollY;

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
    Object.defineProperty(window, "innerHeight", { configurable: true, value: initialInnerHeight });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: initialInnerWidth });
    Object.defineProperty(window, "scrollX", { configurable: true, value: initialScrollX });
    Object.defineProperty(window, "scrollY", { configurable: true, value: initialScrollY });
    document.body.removeAttribute("style");
    document.documentElement.removeAttribute("style");
  });

  it("uses the RICEWIND identity, groups bubbles, and shows time only below the final message", async () => {
    const { container } = render(<OnlineCustomerService locale="zh" config={{ enabled: true, operatorOnline: true, whatsapp: "8617621197907", offlineMessage: "离线" }} />);

    const trigger = screen.getByRole("button", { name: "打开在线客服" });
    expect(trigger.querySelector(".customer-service-launcher-image")).toHaveAttribute("src", expect.stringContaining("support-launcher.webp"));
    expect(trigger.querySelector(".customer-service-trigger-icon")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole("heading", { name: "RICEWIND" })).toBeInTheDocument());

    expect(container.querySelector(".customer-service-trigger")).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".customer-service-trigger-collapse")).toBeInTheDocument();
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
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 240 });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

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
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-240px");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.blur(input);
    viewport.height = 780;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event("resize"));
    expect(panel?.style.getPropertyValue("--customer-service-viewport-height")).toBe("780px");
    expect(panel?.style.getPropertyValue("--customer-service-viewport-top")).toBe("0px");
    expect(panel).not.toHaveAttribute("data-keyboard-open");

    fireEvent.focus(input);
    viewport.height = 410.4;
    viewport.offsetTop = 18.6;
    viewport.dispatchEvent(new Event("scroll"));
    expect(panel?.style.getPropertyValue("--customer-service-viewport-height")).toBe("411px");
    expect(panel?.style.getPropertyValue("--customer-service-viewport-top")).toBe("18px");
    expect(panel).toHaveAttribute("data-keyboard-open");
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector<HTMLButtonElement>(".customer-service-close")!);
    expect(document.body.style.position).toBe("");
    expect(document.body.style.top).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("switches from the image launcher to the down arrow and back", async () => {
    const { container } = render(<OnlineCustomerService locale="zh" config={{ enabled: true, operatorOnline: true, whatsapp: "8617621197907", offlineMessage: "离线" }} />);
    fireEvent.click(screen.getByRole("button", { name: "打开在线客服" }));
    await waitFor(() => expect(container.querySelector(".customer-service-panel")).toBeInTheDocument());
    const collapse = container.querySelector<HTMLButtonElement>(".customer-service-trigger")!;
    expect(collapse.querySelector(".customer-service-trigger-collapse")).toBeInTheDocument();
    fireEvent.click(collapse);
    expect(container.querySelector(".customer-service-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开在线客服" }).querySelector(".customer-service-launcher-image")).toBeInTheDocument();
  });

  it("does not close the mobile panel in response to horizontal swipes", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    const { container } = render(<OnlineCustomerService locale="zh" config={{ enabled: true, operatorOnline: true, whatsapp: "8617621197907", offlineMessage: "离线" }} />);
    fireEvent.click(screen.getByRole("button", { name: "打开在线客服" }));
    await waitFor(() => expect(container.querySelector(".customer-service-panel")).toBeInTheDocument());
    const panel = container.querySelector<HTMLElement>(".customer-service-panel")!;
    fireEvent.touchStart(panel, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 90, clientY: 305 }] });
    expect(container.querySelector(".customer-service-panel")).toBeInTheDocument();
  });

});
