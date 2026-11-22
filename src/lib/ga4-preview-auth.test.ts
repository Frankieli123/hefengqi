vi.mock("server-only",()=>({}));
process.env.GA4_PREVIEW_SECRET="a".repeat(64);
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({headers:vi.fn(),cookies:vi.fn(),secret:"a".repeat(64) as string|undefined}));
vi.mock("next/headers",()=>({headers:mocks.headers,cookies:mocks.cookies}));
vi.mock("@/lib/env",()=>({env:{get GA4_PREVIEW_SECRET(){return mocks.secret;}}}));
import { createPreviewSession, hasValidPreviewCredential, isGa4Preview, previewCookieOptions } from "./ga4-preview-auth";
const secret="a".repeat(64);
const setPath=(path:string)=>mocks.headers.mockResolvedValue(new Headers({"x-ricewind-pathname":path,"x-forwarded-proto":"https"}));
describe("GA4 isolated read-only preview",()=>{
 beforeEach(()=>{mocks.secret=secret;vi.stubEnv("NODE_ENV","production");vi.useFakeTimers();vi.setSystemTime("2026-11-22T12:00:00Z");setPath("/admin/analytics/ga4-preview");});
 it("accepts only the exact credential and a signed unexpired scoped session",async()=>{
  expect(hasValidPreviewCredential(secret)).toBe(true);expect(hasValidPreviewCredential("wrong")).toBe(false);
  expect(previewCookieOptions.path).toBe("/admin/analytics/ga4-preview");
  const session=createPreviewSession();mocks.cookies.mockResolvedValue({get:()=>({value:session.value})});
  expect(await isGa4Preview()).toBe(true);expect(session.expires.getTime()-Date.now()).toBe(21600000);
  vi.advanceTimersByTime(21600001);expect(await isGa4Preview()).toBe(false);
 });
 it("cannot authorize other admin routes or spoofed alternate paths",async()=>{
  const session=createPreviewSession();mocks.cookies.mockResolvedValue({get:()=>({value:session.value})});
  for(const path of ["/admin/products","/admin/analytics/ga4","/admin/analytics/ga4/export","/admin/settings"]){setPath(path);expect(await isGa4Preview()).toBe(false);}
  mocks.headers.mockResolvedValue(new Headers({"x-ricewind-pathname":"/admin/products","next-url":"/admin/analytics/ga4","x-forwarded-proto":"https"}));expect(await isGa4Preview()).toBe(false);
 });
 it("requires configured secret, signed cookie, and secure production transport",async()=>{
  mocks.cookies.mockResolvedValue({get:()=>undefined});expect(await isGa4Preview()).toBe(false);
  const session=createPreviewSession();mocks.cookies.mockResolvedValue({get:()=>({value:session.value})});
  mocks.headers.mockResolvedValue(new Headers({"x-ricewind-pathname":"/admin/analytics/ga4-preview","x-forwarded-proto":"http"}));expect(await isGa4Preview()).toBe(false);
  mocks.secret=undefined;expect(hasValidPreviewCredential(secret)).toBe(false);expect(await isGa4Preview()).toBe(false);
 });
});
