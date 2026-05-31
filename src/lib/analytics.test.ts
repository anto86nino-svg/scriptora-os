import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __clearAnalyticsQueueForTests,
  __readAnalyticsQueueForTests,
  trackEvent,
  trackFirstProjectCreated,
} from "./analytics";

describe("analytics", () => {
  beforeEach(() => {
    __clearAnalyticsQueueForTests();
    vi.stubEnv("DEV", false);
  });

  it("queues events in prod", () => {
    trackEvent("checkout_started", { plan: "pro" });
    const queue = __readAnalyticsQueueForTests();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.event).toBe("checkout_started");
    expect(queue[0]?.props?.plan).toBe("pro");
  });

  it("is silent in dev unless debug flag set", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_ANALYTICS_DEBUG", "");
    trackEvent("paywall_opened");
    expect(__readAnalyticsQueueForTests()).toHaveLength(0);
  });

  it("fires first_project_created only once", () => {
    trackFirstProjectCreated({ genre: "thriller" });
    trackFirstProjectCreated({ genre: "thriller" });
    const events = __readAnalyticsQueueForTests().filter((e) => e.event === "first_project_created");
    expect(events).toHaveLength(1);
  });
});
