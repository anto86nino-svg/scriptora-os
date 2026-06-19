import { describe, expect, it } from "vitest";
import { getControlledScrollTop } from "./dashboard-panel-scroll";

describe("dashboard panel controlled scroll", () => {
  it("calcola offset sticky senza riportare la pagina in alto", () => {
    expect(getControlledScrollTop(640, 1200, 92)).toBe(1748);
  });

  it("non produce scroll negativo quando il pannello e' gia' in alto", () => {
    expect(getControlledScrollTop(20, 0, 92)).toBe(0);
  });
});
