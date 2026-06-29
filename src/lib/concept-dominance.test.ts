import { describe, expect, it } from "vitest";
import {
  buildSupernaturalThrillerSecondaryCast,
  buildSupernaturalThrillerSubtitle,
  extractConceptProtagonist,
  hasHighConceptFantasySignals,
  hasExplicitRomanceSignals,
  hasSupernaturalThrillerSignals,
  isGenericPhilosophyTitleForFiction,
  resolveConceptDominance,
  sanitizeUserConceptInput,
} from "@/lib/concept-dominance";
import { prepareOneFlowWriterPackage, startOneFlowSession } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";

describe("concept-dominance", () => {
  const eliasIdea =
    "Elias, la porta nel cuore, ricordi di una donna vissuta mille anni prima, data della fine del mondo";

  const martaIdea =
    "Thriller soprannaturale. Ogni notte alle 03:17 nel piccolo paese, Marta insegnante riceve ricordi dettagliati dal futuro. Una visione mostra la sua morte. Memoria, tempo, destino.";

  it("detects high-concept fantasy without romance drift", () => {
    expect(hasHighConceptFantasySignals(eliasIdea)).toBe(true);
    expect(hasExplicitRomanceSignals(eliasIdea)).toBe(false);
  });

  it("does not treat porta nel cuore as romance", () => {
    expect(hasExplicitRomanceSignals("porta nel cuore e ricordi antichi")).toBe(false);
  });

  it("resolves fantasy dominance for Elias concept", () => {
    const resolved = resolveConceptDominance(eliasIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("fantasy");
    expect(resolved.blockRomanceTemplates).toBe(true);
    expect(resolved.blockPhilosophyBlueprint).toBe(true);
    expect(resolved.protagonist).toBe("Elias");
  });

  it("rejects generic philosophy title for fantasy concept", () => {
    expect(isGenericPhilosophyTitleForFiction("Quello che Essere Nasconde", eliasIdea)).toBe(true);
  });

  it("sanitizes UI noise and chip prefixes from concept input", () => {
    const dirty =
      "Idea di libro: Fantasy, High Concept, Mistero, Destino, Memoria. Thriller soprannaturale. Ogni notte alle 03:17 nel piccolo paese, Marta insegnante riceve ricordi dal futuro.";
    const cleaned = sanitizeUserConceptInput(dirty);
    expect(cleaned.toLowerCase()).toMatch(/thriller soprannaturale/);
    expect(cleaned).not.toMatch(/^Idea di libro/i);
    expect(extractConceptProtagonist(cleaned)).toBe("Marta");
    expect(extractConceptProtagonist(cleaned)).not.toBe("Idea");
  });

  it("detects supernatural thriller and blocks fantasy drift for Marta concept", () => {
    expect(hasSupernaturalThrillerSignals(martaIdea)).toBe(true);
    expect(hasHighConceptFantasySignals(martaIdea)).toBe(false);

    const resolved = resolveConceptDominance(martaIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("thriller");
    expect(resolved.blockFantasyTemplates).toBe(true);
    expect(resolved.protagonist).toBe("Marta");
  });

  it("does not classify future-memory thriller as epic fantasy from ricordi/destino/futuro alone", () => {
    expect(hasHighConceptFantasySignals("ricordi dal futuro, destino, memoria e tempo in un paese")).toBe(false);
  });

  it("builds supernatural thriller subtitle with futuro, morte and ricordi", () => {
    const subtitle = buildSupernaturalThrillerSubtitle(martaIdea, "commercial");
    expect(subtitle.toLowerCase()).toMatch(/futuro|morte|ricord/);
    expect(subtitle).toMatch(/ucciderla/i);
    expect(buildSupernaturalThrillerSecondaryCast().join(" ")).toMatch(/sceriffo/i);
  });

  it("keeps Marta 03:17 thriller through One Flow without fantasy template contamination", () => {
    const dirty =
      "Idea di libro: Fantasy, High Concept, Mistero, Destino, Memoria. " + martaIdea;
    const session = startOneFlowSession(dirty, { genreHint: "Fantasy", language: "Italiano" });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      session.proposal?.title ?? "",
      session.proposal?.subtitle ?? "",
      session.proposal?.promise ?? "",
      session.proposal?.characters ?? "",
      session.proposal?.premise ?? "",
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/marta/i);
    expect(joined).toMatch(/03:17/);
    expect(joined).toMatch(/thriller|morte|futuro|ricord/i);
    expect(joined).toMatch(/sceriffo/i);
    expect(session.proposal?.subtitle?.toLowerCase() ?? "").toMatch(/futuro|morte|ricord/);
    expect(session.proposal?.characters?.toLowerCase() ?? "").toMatch(/marta/);
    expect(session.proposal?.characters?.toLowerCase() ?? "").toMatch(/sceriffo/);
    expect(joined).not.toMatch(/kael/i);
    expect(joined).not.toMatch(/magia proibita/i);
    expect(joined).not.toMatch(/fantasy epico|epic fantasy/i);
    expect(joined).not.toMatch(/mille anni/i);
    expect(joined).not.toMatch(/\bidea\b.*vs/i);
    expect(extractConceptProtagonist(session.rawIdea)).toBe("Marta");
  });
});
