import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/products/source-model" }));
vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/ui/dropdown-menu", () => ({
 DropdownMenu: ({children}: {children: ReactNode}) => <div>{children}</div>,
 DropdownMenuContent: ({children}: {children: ReactNode}) => <div>{children}</div>,
 DropdownMenuGroup: ({children}: {children: ReactNode}) => <div>{children}</div>,
 DropdownMenuTrigger: () => null,
 DropdownMenuItem: ({children,onClick}: {children: ReactNode;onClick: () => void}) => <button role="menuitem" onClick={onClick}>{children}</button>,
}));
import { LanguageSwitcher } from "./language-switcher";
describe("language menu", () => {
 afterEach(() => { cleanup();vi.unstubAllGlobals();replace.mockReset(); });
 it("puts English first and Chinese last, preserving other languages", () => {
  render(<LanguageSwitcher label="Language" />);
  expect(screen.getAllByRole("menuitem").map(el => el.textContent)).toEqual(["English","Русский","Français","Deutsch","Español","العربية","中文（简体）"]);
 });
 it("retains translated product path, query and fragment", async () => {
  window.history.replaceState({},"","/en/products/source-model?ref=test&page=2#specs");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({json: async () => ({targetPath: "/products/translated-model"})}));
  render(<LanguageSwitcher label="Language" />);
  fireEvent.click(screen.getByRole("menuitem",{name:"Français"}));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/products/translated-model?ref=test&page=2#specs",{locale:"fr"}));
 });
 it("retains current path and query when locale API is unavailable", async () => {
  window.history.replaceState({},"","/en/products/source-model?ref=test#specs");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({json: async () => ({})}));
  render(<LanguageSwitcher label="Language" />);
  fireEvent.click(screen.getByRole("menuitem",{name:"Deutsch"}));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/products/source-model?ref=test#specs",{locale:"de"}));
 });
});
