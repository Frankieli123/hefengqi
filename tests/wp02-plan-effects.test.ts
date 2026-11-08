import { afterEach, expect, it, vi } from "vitest";
import fs from "node:fs";
import fsp from "node:fs/promises";
import childProcess from "node:child_process";
import net from "node:net";
import { planCli } from "../scripts/seo-data/schedule-plan";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("pure dry-run/help/error paths perform no I/O, shell, socket or timer", () => {
  const forbidden = () => { throw new Error("SIDE_EFFECT_FORBIDDEN"); };
  const spies = [vi.spyOn(fs, "writeFileSync").mockImplementation(forbidden), vi.spyOn(fsp, "writeFile").mockImplementation(forbidden), vi.spyOn(fs, "readFileSync").mockImplementation(forbidden), vi.spyOn(fsp, "readFile").mockImplementation(forbidden), vi.spyOn(childProcess, "exec").mockImplementation(forbidden), vi.spyOn(childProcess, "spawn").mockImplementation(forbidden), vi.spyOn(net, "connect").mockImplementation(forbidden), vi.spyOn(globalThis, "setInterval").mockImplementation(forbidden)];
  vi.stubGlobal("fetch", vi.fn(forbidden));
  const args = ["--dry-run", "--now", "2026-11-08T12:00:00Z", "--start", "2026-11-01", "--end", "2026-11-07", "--source", "gsc", "--review-start", "2026-11-01", "--review-end", "2026-11-07"];
  expect(planCli(["--help"]).code).toBe(0);
  expect(planCli([]).code).toBe(1);
  expect(planCli(args).code).toBe(0);
  expect(planCli(args.map((arg) => arg === "gsc" ? "umami" : arg)).code).toBe(0);
  for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
