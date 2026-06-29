import { describe, expect, it } from "vitest";
import { getAllOsHousePaths, getOsHouse, OS_HOUSE_PATHS } from "@/lib/os/os-house-registry";

describe("os house registry", () => {
  it("exposes all five house paths", () => {
    expect(getAllOsHousePaths()).toEqual([
      "/os/scrittura",
      "/os/pubblicazione",
      "/os/mercato",
      "/os/studio",
      "/os/impostazioni",
    ]);
  });

  it("resolves each house with tools", () => {
    expect(getOsHouse("scrittura").path).toBe(OS_HOUSE_PATHS.scrittura);
    expect(getOsHouse("pubblicazione").tools.length).toBeGreaterThan(0);
    expect(getOsHouse("mercato").tools.some((tool) => tool.route.includes("title"))).toBe(true);
    expect(getOsHouse("studio").tools.some((tool) => tool.route === "/study")).toBe(true);
    expect(getOsHouse("impostazioni").tools.some((tool) => tool.id === "settings-hub")).toBe(true);
  });
});
