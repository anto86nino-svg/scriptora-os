import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearUsageEvents, getUsageEvents, summarizeUsageEvents, trackScriptoraEvent } from "./usage-analytics";

describe("usage analytics", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("DEV", true);
  });

  it("stores safe metadata events and summarizes the funnel", () => {
    trackScriptoraEvent({ eventName: "home_cta_clicked", cta: "hero", tool: "home", success: true });
    trackScriptoraEvent({ eventName: "book_forge_opened", tool: "book-forge", success: true });
    trackScriptoraEvent({ eventName: "blueprint_generated", projectId: "p1", tool: "book-forge", success: true });
    const events = getUsageEvents();
    expect(events).toHaveLength(3);
    expect(JSON.stringify(events)).not.toMatch(/manoscritto completo|chapter content/i);
    const summary = summarizeUsageEvents(events);
    expect(summary.funnel.home).toBe(1);
    expect(summary.funnel.bookForge).toBe(1);
    expect(summary.blueprintGenerated).toBe(1);
  });

  it("clears events", () => {
    trackScriptoraEvent({ eventName: "study_fallback_local_used", tool: "study", success: true });
    clearUsageEvents();
    expect(getUsageEvents()).toEqual([]);
  });
});
