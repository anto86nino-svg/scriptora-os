import { describe, expect, it } from "vitest";
import { isOwnerEmail } from "./owner";

describe("owner allowlist", () => {
  it("recognizes default owner email case-insensitively", () => {
    expect(isOwnerEmail("natasharomanoff1990anto@gmail.com")).toBe(true);
    expect(isOwnerEmail("NatashaRomanoff1990Anto@Gmail.com")).toBe(true);
  });

  it("rejects non-owner emails", () => {
    expect(isOwnerEmail("user@example.com")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
  });
});
