import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SCRIPTORA_APPEARANCE, SCRIPTORA_APPEARANCE_KEY } from "@/lib/scriptora-appearance";
import { purgeImmersiveThemeExperiment } from "@/lib/theme-reset";

describe("purgeImmersiveThemeExperiment", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.removeAttribute("data-atmosphere-profile");
  });

  it("removes horror atmosphere profile and gateway session keys", () => {
    localStorage.setItem("scriptora-atmosphere-profile-v1", "horror-gothic");
    sessionStorage.setItem("scriptora-gateway-genre-prefill", "horror");

    purgeImmersiveThemeExperiment();

    expect(localStorage.getItem("scriptora-atmosphere-profile-v1")).toBeNull();
    expect(sessionStorage.getItem("scriptora-gateway-genre-prefill")).toBeNull();
    expect(document.documentElement.getAttribute("data-atmosphere-profile")).toBeNull();
  });

  it("resets invasive gothic backgrounds to clean default", () => {
    localStorage.setItem(
      SCRIPTORA_APPEARANCE_KEY,
      JSON.stringify({ backgroundId: "gothic-violet", writingFont: "system" }),
    );

    purgeImmersiveThemeExperiment();

    const saved = JSON.parse(localStorage.getItem(SCRIPTORA_APPEARANCE_KEY) || "{}");
    expect(saved.backgroundId).toBe(DEFAULT_SCRIPTORA_APPEARANCE.backgroundId);
  });
});
