import { describe, expect, it } from "vitest";
import { hasInvalidServerActionId } from "./request-guard";

describe("malformed Next server action requests", () => {
  it("rejects the scanner sentinel before React parses it", () => {
    expect(hasInvalidServerActionId("x")).toBe(true);
  });

  it("does not block valid server action IDs or normal form/API requests", () => {
    expect(hasInvalidServerActionId("a".repeat(40))).toBe(false);
    expect(hasInvalidServerActionId(undefined)).toBe(false);
  });
});
