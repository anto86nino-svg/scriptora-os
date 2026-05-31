import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __clearMonitoringQueueForTests,
  __readMonitoringQueueForTests,
  captureException,
  captureMessage,
  initMonitoring,
} from "./monitoring";

describe("monitoring", () => {
  beforeEach(() => {
    __clearMonitoringQueueForTests();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_MONITORING_ENDPOINT", "https://example.com/monitor");
  });

  it("queues exceptions in prod when endpoint configured", () => {
    captureException(new Error("boom"), { area: "checkout" });
    const queue = __readMonitoringQueueForTests();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.area).toBe("checkout");
    expect(queue[0]?.kind).toBe("exception");
  });

  it("is silent in dev", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_MONITORING_ENDPOINT", "");
    vi.stubEnv("VITE_SENTRY_DSN", "");
    captureMessage("hello", { area: "generation" });
    expect(__readMonitoringQueueForTests()).toHaveLength(0);
  });

  it("initMonitoring does not throw without Sentry", () => {
    expect(() => initMonitoring()).not.toThrow();
  });
});
