// @vitest-environment node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compatibilityIntro, expectedCompatibilityBlocks } from "./fixtures/wp03-compatibility";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { fAQ: { findMany } } }));
vi.mock("@/lib/env", () => ({ env: {} }));

import { GET as rootGET } from "@/app/llms.txt/route";
import { GET as fullGET } from "@/app/llms-full.txt/route";
import { GET as supportGET } from "@/app/support/cross-reference/llms.txt/route";

const routes = [
  { path: "/llms.txt", get: rootGET },
  { path: "/llms-full.txt", get: fullGET },
  { path: "/support/cross-reference/llms.txt", get: supportGET },
];

async function staticRouteCopy(path: string) {
  const publicBody = await readFile(join(process.cwd(), "public", path), "utf8");
  if (path !== "/llms-full.txt") return publicBody;
  expect(publicBody).toContain("# RICEWIND (禾风起 / HEFENGQI) — Full Technical Catalog & Engineering Reference (Complete Single-File Index)");
  expect(publicBody).toContain("- Brand / Legal Entity: RICEWIND / HEFENGQI (杭州禾风起信息科技有限公司)");
  return publicBody
    .replace("# RICEWIND (禾风起 / HEFENGQI) — Full Technical Catalog & Engineering Reference (Complete Single-File Index)", "# RICEWIND — Full Technical Catalog & Engineering Reference (Complete Single-File Index)")
    .replace("- Brand / Legal Entity: RICEWIND / HEFENGQI (杭州禾风起信息科技有限公司)", "- Brand / Entity: RICEWIND (Official Global Portal)");
}

function relationshipBlocks(content: string) {
  return [...content.matchAll(/^\[Cross-Reference: [^\]\n]+\]\n(?:- [^\n]+(?:\n|$))+/gm)]
    .map(([block]) => block.trimEnd());
}

function assertRelationships(content: string) {
  const rootHeading = "## Hardware Cross-Reference & Replacement Knowledge Base";
  const heading = content.includes(rootHeading)
    ? rootHeading
    : "# RICEWIND — Telecom Power Cross-Reference & Replacement Knowledge Base";
  const endHeading = heading === rootHeading
    ? "## Content Policy & Verification"
    : "## Technical Inquiry & Engineering Pinout Confirmation";
  const sectionStart = content.indexOf(heading);
  const sectionEnd = content.indexOf(endHeading, sectionStart);
  expect(sectionStart).toBeGreaterThanOrEqual(0);
  expect(sectionEnd).toBeGreaterThan(sectionStart);
  expect(content.slice(sectionStart + heading.length, sectionEnd).trim())
    .toBe([compatibilityIntro, ...expectedCompatibilityBlocks].join("\n\n"));
  expect(content).toContain(compatibilityIntro);
  expect(content.match(/^\[Cross-Reference:/gm)).toHaveLength(8);
  expect(relationshipBlocks(content)).toEqual(expectedCompatibilityBlocks);
}

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
});

describe("WP03 real GET compatibility boundaries", () => {
  it("outputs all three actual response bodies and enforces identical exact eight-relation fixtures", async () => {
    const output = await mkdtemp(join(tmpdir(), "wp03-get-"));
    const bodies = [];
    for (const route of routes) {
      const response = await route.get();
      const body = await response.text();
      const filename = join(output, route.path.slice(1).replaceAll("/", "__"));
      await writeFile(filename, body);
      console.info(`GET ${route.path} -> ${response.status}; full body: ${filename}\n${body}`);
      bodies.push(body);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    }
    for (const body of bodies) assertRelationships(body);
    expect(relationshipBlocks(bodies[0])).toEqual(relationshipBlocks(bodies[1]));
    expect(relationshipBlocks(bodies[1])).toEqual(relationshipBlocks(bodies[2]));
  });

  it.each(routes)("$path public copy matches GET, excluding only two pre-existing full-index identity lines", async (route) => {
    const body = await (await route.get()).text();
    const publicBody = await staticRouteCopy(route.path);
    expect(publicBody).toBe(body);
    assertRelationships(publicBody);
  });

  it("appends the DB FAQ unchanged after the static catalog, without pretending to validate DB claims", async () => {
    const answer = "MOCK ONLY: legacy compatibility assertion retained for separate CMS review.";
    findMany.mockResolvedValue([
      { question: "Mock OEM configuration?", answer, productTranslation: { name: "Mock module", slug: "mock-module" } },
      { question: "Mock missing relation?", answer: "Mock answer", productTranslation: null },
    ]);
    const body = await (await fullGET()).text();
    const staticBody = await staticRouteCopy("/llms-full.txt");
    const expectedAppend = "\n\n---\n\n# RICEWIND — Carrier-Grade Telecom Equipment Field Q&A & Diagnostic Knowledge Base\n\n> Direct engineering Q&A corpus indexed for AI reasoning engines (ChatGPT, Claude, Perplexity, Copilot). Contains deterministic field operational parameters, replacement boundaries, pinout configurations, and troubleshooting procedures.\n\n"
      + `### [Q&A Tuple 1] Mock OEM configuration?\n- **Related Product**: Mock module\n- **Canonical Reference**: https://ricewind.com/en/products/mock-module\n- **Engineering Answer**: ${answer}\n\n`
      + "### [Q&A Tuple 2] Mock missing relation?\n- **Related Product**: Telecom Infrastructure\n- **Canonical Reference**: https://ricewind.com/en/products/undefined\n- **Engineering Answer**: Mock answer\n\n";
    const output = await mkdtemp(join(tmpdir(), "wp03-faq-"));
    await writeFile(join(output, "llms-full.txt"), body);
    console.info(`GET /llms-full.txt with mock DB append; full body: ${output}/llms-full.txt\n${body}`);
    expect(body).toBe(staticBody + expectedAppend);
    assertRelationships(body);
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { productTranslation: { locale: "en" } }, take: 60, orderBy: { sortOrder: "asc" },
      select: { question: true, answer: true, productTranslation: { select: { name: true, slug: true } } },
    });
  });

  it("keeps the static response when DB returns no FAQ", async () => {
    expect(await (await fullGET()).text()).toBe(await staticRouteCopy("/llms-full.txt"));
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("keeps the static response when the mocked DB fails", async () => {
    findMany.mockRejectedValue(new Error("mock-only-db-failure"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await fullGET();
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(await staticRouteCopy("/llms-full.txt"));
      expect(errorLog).toHaveBeenCalledWith("Failed to fetch dynamic FAQs for llms-full.txt:", expect.any(Error));
    } finally {
      errorLog.mockRestore();
    }
  });
});
