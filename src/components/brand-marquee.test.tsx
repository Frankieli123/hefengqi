import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandMarquee } from "@/components/brand-marquee";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

const brands = [
  { name: "VERTIV", key: "vertiv", href: "/products?q=vertiv" },
  { name: "HUAWEI", key: "huawei", href: "/products?q=huawei" },
  { name: "DELTA", key: "delta", href: "/products?q=delta" },
  { name: "ELTEK", key: "eltek", href: "/products?q=eltek" },
  { name: "SANTAK", key: "santak", href: "/products?q=santak" },
  { name: "ZTE", key: "zte", href: "/products?q=zte" },
] as const;

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const source = fs.readFileSync(path.join(root, "src/components/brand-marquee.tsx"), "utf8");

afterEach(cleanup);

describe("BrandMarquee seamless loop", () => {
  it("renders two equivalent groups while exposing only one accessible brand set", () => {
    const { container } = render(<BrandMarquee brands={brands} />);
    const groups = [...container.querySelectorAll("[data-marquee-group]")];
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.textContent)).toEqual([
      brands.map((brand) => brand.name).join(""),
      brands.map((brand) => brand.name).join(""),
    ]);
    expect(groups[1]).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll("a")).toHaveLength(12);
    expect(container.querySelectorAll('a:not([tabindex="-1"])')).toHaveLength(6);
  });

  it("moves exactly one group stride and provides a non-clipping reduced-motion fallback", () => {
    expect(css).toMatch(/@keyframes marquee-scroll[\s\S]*translate3d\(-100%,\s*0,\s*0\)/);
    expect(css).toMatch(/\.brand-marquee-track\s*>\s*\.brand-marquee-group/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.brand-marquee-viewport[\s\S]*(overflow-x:\s*auto|overflow:\s*visible)/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.brand-marquee-track[\s\S]*animation:\s*none/);
    expect(source).not.toContain('"use client"');
    expect(source).not.toMatch(/import React/);
  });
});

describe("copy-standalone-assets", () => {
  it("returns non-zero without damaging existing artifacts when a required source is missing", () => {
    const fixture = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "copy-assets-failure-"));
    fs.mkdirSync(path.join(fixture, ".next/static"), { recursive: true });
    fs.mkdirSync(path.join(fixture, ".next/standalone/.next/static"), { recursive: true });
    fs.mkdirSync(path.join(fixture, ".next/standalone/public"), { recursive: true });
    fs.writeFileSync(path.join(fixture, ".next/standalone/server.js"), "server");
    fs.writeFileSync(path.join(fixture, ".next/standalone/.next/static/sentinel.txt"), "keep-static");
    fs.writeFileSync(path.join(fixture, ".next/standalone/public/sentinel.txt"), "keep-public");

    const result = spawnSync(process.execPath, [path.join(root, "scripts/copy-standalone-assets.js")], {
      cwd: fixture,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Failed to copy standalone assets");
    expect(fs.readFileSync(path.join(fixture, ".next/standalone/.next/static/sentinel.txt"), "utf8")).toBe("keep-static");
    expect(fs.readFileSync(path.join(fixture, ".next/standalone/public/sentinel.txt"), "utf8")).toBe("keep-public");
  });
});
