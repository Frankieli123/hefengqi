import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it, vi } from "vitest";
vi.mock("next-intl/server", () => ({getLocale: async () => "en",getTranslations: async () => (key: string) => key}));
vi.mock("@/lib/content-repository", () => ({getCategories: async () => []}));
vi.mock("@/i18n/navigation", () => ({Link: ({href,children}: {href:string;children:ReactNode}) => <a href={href}>{children}</a>}));
vi.mock("@/components/brand-mark", () => ({BrandMark: () => <span>RICEWIND</span>}));
import { SiteFooter } from "./site-footer";
async function footer() {return load(renderToStaticMarkup(await SiteFooter()));}
describe("shared footer contact channels", () => {
 it("keeps email icons and addresses in the same aligned row", () => {
  const css=readFileSync("src/app/globals.css","utf8");
  const rule=css.match(/\.site-footer-email-copy\s*\{([^}]+)\}/)?.[1];
  expect(rule).toMatch(/display:\s*inline-flex/);
  expect(rule).toMatch(/align-items:\s*center/);
 });
 it("links to the official Facebook page safely with an accessible brand label", async () => {
  const $=await footer();const a=$('.site-footer-contact a[href="https://www.facebook.com/profile.php?id=61594261613869"]');
  expect(a.length).toBe(1);expect(a.text()).toBe("Facebook");expect(a.attr("target")).toBe("_blank");expect(a.attr("rel")?.split(" ").sort()).toEqual(["noopener","noreferrer"]);
 });
 it("renders decorative real SVG icons for both emails, phone, WhatsApp and Facebook without changing contact values", async () => {
  const $=await footer();const contact=$(".site-footer-contact");
  expect(contact.find("svg").length).toBe(5);
  for (const name of ["mail","phone","whatsapp","facebook"]) {
   const icons=contact.find(`svg[data-contact-icon="${name}"]`);expect(icons.length).toBe(name==="mail"?2:1);
   icons.each((_,el) => {expect($(el).attr("aria-hidden")).toBe("true");expect($(el).attr("viewBox")).toBe("0 0 24 24");expect($(el).find("path,rect").length).toBeGreaterThan(0);});
  }
  expect(contact.find('button[aria-label="lee@ricewind.com"]').text()).toBe("lee@ricewind.com");
  expect(contact.find('button[aria-label="cheng@ricewind.com"]').text()).toBe("cheng@ricewind.com");
  expect(contact.find('a[href="tel:+8617621197907"]').text()).toContain("+86 17621197907");
  expect(contact.find('a[href="https://wa.me/8617621197907"]').text()).toContain("+8617621197907");
 });
});

it("exposes seven real localized homepage links in server HTML", async () => {
 const $=await footer();const a=$("nav[data-language-homes] a");expect(a.map((_,el)=>$(el).attr("href")).get()).toEqual(["/en","/ru","/fr","/de","/es","/ar","/zh"]);expect(a.filter('[hreflang="ru"]').text()).toBe("Русский");
});
