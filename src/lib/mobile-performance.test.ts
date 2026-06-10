import { describe, expect, it } from "vitest";
import { SCRIPTORA_MOBILE_LITE_CLASS } from "./mobile-performance";

describe("mobile performance boot", () => {
  it("exports mobile lite class name for CSS hook", () => {
    expect(SCRIPTORA_MOBILE_LITE_CLASS).toBe("scriptora-mobile-lite");
  });
});
