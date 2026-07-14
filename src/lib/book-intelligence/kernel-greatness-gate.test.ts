import { describe, expect, it, vi } from "vitest";
import {
  enforceKernelGreatnessBeforeForge,
  isKernelGreatnessGateBypassed,
} from "./kernel-greatness-gate";

describe("kernel greatness pre-forge gate", () => {
  it("allows strong fiction concepts on happy path", () => {
    vi.stubEnv("VITE_SCRIPTORA_DEV_MODE", "");
    vi.stubEnv("VITE_SCRIPTORA_GREATNESS_GATE", "");

    const gate = enforceKernelGreatnessBeforeForge({
      config: {
        title: "La casa che ricorda",
        subtitle: "Una verità familiare trasforma ogni stanza in una minaccia.",
        genre: "horror" as const,
        category: "Fiction",
        subcategory: "Gothic Horror",
        targetReader: "Lettori adulti di horror gotico e misteri familiari.",
        promise: "Una casa infestata diventa il luogo in cui la protagonista deve scegliere cosa ricordare.",
        idea: "Elena torna nella casa della madre scomparsa e scopre che ogni stanza conserva un ricordo che la casa vuole vendicare.",
        plot: "Una restauratrice torna nella casa della madre scomparsa.",
      },
    });

    expect(gate.allowed).toBe(true);
    expect(["allowed", "refined"]).toContain(gate.status);
  });

  it("blocks generic romance copy with Italian guidance", () => {
    vi.stubEnv("VITE_SCRIPTORA_DEV_MODE", "");
    vi.stubEnv("VITE_SCRIPTORA_GREATNESS_GATE", "");

    const gate = enforceKernelGreatnessBeforeForge({
      allowRefine: false,
      config: {
        title: "Amore e destino",
        genre: "romance" as const,
        idea: "Una storia intensa dove amore e destino cambieranno tutto.",
      },
    });

    expect(gate.allowed).toBe(false);
    expect(gate.status).toBe("blocked");
    expect(gate.message).toMatch(/generico|specificità|Blueprint/i);
    expect(gate.message).not.toMatch(/evaluateKernelGreatness|reject/i);
  });

  it("refines weak poetry concept once then allows", () => {
    vi.stubEnv("VITE_SCRIPTORA_DEV_MODE", "");
    vi.stubEnv("VITE_SCRIPTORA_GREATNESS_GATE", "");

    const gate = enforceKernelGreatnessBeforeForge({
      config: {
        bookFormat: "poetry_collection",
        genre: "poetry" as const,
        subcategory: "poesia contemporanea",
        chapterCount: 60,
        subchaptersPerChapter: 4,
        idea: "Una raccolta guidata da immagini.",
      } as any,
    });

    expect(gate.refined).toBe(true);
    expect(gate.conceptText).toContain("Tema centrale");
    expect(gate.allowed).toBe(true);
  });

  it("supports dev bypass via env flag", () => {
    vi.stubEnv("VITE_SCRIPTORA_GREATNESS_GATE", "off");
    expect(isKernelGreatnessGateBypassed()).toBe(true);

    const gate = enforceKernelGreatnessBeforeForge({
      allowRefine: false,
      config: {
        genre: "romance" as const,
        idea: "Una storia intensa dove amore e destino cambieranno tutto.",
      },
    });

    expect(gate.status).toBe("bypassed");
    expect(gate.allowed).toBe(true);
  });
});
