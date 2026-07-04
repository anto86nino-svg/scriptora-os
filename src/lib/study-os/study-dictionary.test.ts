import { describe, expect, it, vi } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  buildDictionaryIndex,
  formatDictionaryLookup,
  lookupDictionaryTerm,
  lookupDictionaryWithAI,
} from "@/lib/study-os/study-dictionary";

describe("Study Dictionary", () => {
  const result = analyzeStudyMaterial(
    "La fotosintesi clorofilliana trasforma energia luminosa in glucosio. ".repeat(10),
    "biologia.txt",
    { studySubject: "biology" },
  );
  const plan = buildStudyIntelligencePlan({ text: result.lightSummary, subject: "biology" });

  it("builds index from difficultWords and kernel concepts", () => {
    const index = buildDictionaryIndex(result.difficultWords, result.keyConcepts, plan);
    expect(index.size).toBeGreaterThan(0);
  });

  it("formats bambino mode with simple explanation", () => {
    const index = buildDictionaryIndex(result.difficultWords, result.keyConcepts, plan);
    const [first] = Array.from(index.values());
    const lookup = formatDictionaryLookup(first, "bambino");
    expect(lookup.headline).toContain("10 anni");
    expect(lookup.body.length).toBeGreaterThan(10);
  });

  it("formats universitario mode with technical detail", () => {
    const index = buildDictionaryIndex(result.difficultWords, result.keyConcepts, plan);
    const [first] = Array.from(index.values());
    const lookup = formatDictionaryLookup(first, "universitario", 5);
    expect(lookup.headline).toContain("universitario");
    expect(lookup.body).toContain(first.tecnica.slice(0, 20));
  });

  it("lookup returns null for unknown term", () => {
    const index = buildDictionaryIndex(result.difficultWords, [], plan);
    expect(lookupDictionaryTerm(index, "xyznonexistent", "bambino")).toBeNull();
  });

  it("falls back to local when AI lookup fails", async () => {
    const index = buildDictionaryIndex(result.difficultWords, result.keyConcepts, plan);
    const [first] = Array.from(index.values());
    const lookup = await lookupDictionaryWithAI(index, first.term, "bambino", {
      aiLookup: vi.fn().mockRejectedValue(new Error("offline")),
    });
    expect(lookup?.body).toContain(first.semplice.slice(0, 12));
    expect(lookup?.source).not.toBe("ai");
  });

  it("uses AI body when lookup succeeds", async () => {
    const index = buildDictionaryIndex(result.difficultWords, result.keyConcepts, plan);
    const [first] = Array.from(index.values());
    const lookup = await lookupDictionaryWithAI(index, first.term, "universitario", {
      aiLookup: vi.fn().mockResolvedValue({
        body: "Definizione AI arricchita per il termine.",
        headline: "Spiegazione AI",
        source: "ai" as const,
      }),
    });
    expect(lookup?.source).toBe("ai");
    expect(lookup?.body).toContain("Definizione AI");
  });
});
