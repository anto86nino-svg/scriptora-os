import { describe, expect, it } from "vitest";
import { downloadItems } from "./downloads";

describe("download center platforms", () => {
  it("exposes the iPhone Xcode project as the primary mobile build", () => {
    const ios = downloadItems.find((item) => item.id === "ios-xcode-project");

    expect(ios).toMatchObject({
      platform: "ios",
      fileType: "zip",
      recommended: true,
    });
    expect(ios?.description).toMatch(/Capacitor iOS|iPhone|Xcode/i);
  });
});
