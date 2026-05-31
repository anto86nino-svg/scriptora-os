import { describe, expect, it } from "vitest";
import {
  canHandleIntentInPlace,
  getFallbackRoute,
  parseOpenQuery,
  stripOpenQuery,
} from "./scriptora-requirement-actions";

describe("scriptora-requirement-actions", () => {
  it("uses contextual dashboard query fallback for author identity", () => {
    expect(getFallbackRoute("open_author_identity")).toBe("/dashboard?open=author-identity");
  });

  it("does not use generic /dashboard for export studio", () => {
    expect(getFallbackRoute("open_export_studio")).toBe("/dashboard?open=export-studio");
    expect(getFallbackRoute("open_export_studio")).not.toBe("/dashboard");
  });

  it("parses and strips open query params without loops", () => {
    const parsed = parseOpenQuery("?open=author-identity&focus=input&index=2");
    expect(parsed.open).toBe("author-identity");
    expect(parsed.focus).toBe("input");
    expect(parsed.chapterIndex).toBe(2);
    expect(stripOpenQuery("?open=author-identity&feature=export")).toBe("?feature=export");
    expect(stripOpenQuery("?open=export-studio")).toBe("");
  });

  it("recognizes dashboard and editor as in-place handlers for author identity", () => {
    const original = window.location.pathname;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, pathname: "/dashboard" },
    });
    expect(canHandleIntentInPlace("open_author_identity")).toBe(true);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, pathname: "/app" },
    });
    expect(canHandleIntentInPlace("open_author_identity")).toBe(true);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, pathname: original },
    });
  });
});
