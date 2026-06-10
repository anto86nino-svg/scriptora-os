import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./lazyWithRetry";

describe("lazyWithRetry", () => {
  it("detects vite chunk load failures", () => {
    const error = new Error(
      "Failed to fetch dynamically imported module: https://scriptora-os.vercel.app/assets/UsagePage-CTwqTq2c.js",
    );
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isChunkLoadError(new Error("Network timeout"))).toBe(false);
  });
});
