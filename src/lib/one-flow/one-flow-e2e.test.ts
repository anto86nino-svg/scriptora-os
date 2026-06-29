import { describe, expect, it } from "vitest";
import {
  applyProposalEditIntent,
  prepareOneFlowWriterPackage,
  resolveQuestionBudget,
  startOneFlowSession,
} from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import { validateBlueprintEntityCoverage } from "@/lib/blueprint-entity-enrichment";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";
import { isGenericNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { validateProjectGenerationReadiness } from "@/lib/project-generation-readiness";
import { canStartWritingFromSession } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";

const STATION_IDEA = `Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare per sette minuti tra due gallerie inesistenti.
Elia trova una fotografia della madre con scritto:
"Non lasciare che io salga sul treno."
Fotografie che cambiano.
Ricordi che si riscrivono.
Donna vestita di nero.
Persone cancellate dall'esistenza.`;

describe("One Flow e2e — stazione 03:17 horror", () => {
  it("uses a tight question budget for rich horror ideas", () => {
    expect(resolveQuestionBudget(STATION_IDEA)).toBeLessThanOrEqual(2);
  });

  it("builds entity-aware proposal with non-truncated title and specific promise", () => {
    const session = startOneFlowSession(STATION_IDEA, { genreHint: "Horror", language: "Italiano" });
    expect(session.proposal).toBeTruthy();
    expect(isInvalidGeneratedTitle(session.proposal!.title, STATION_IDEA)).toBe(false);
    expect(isGenericNarrativePromise(session.proposal!.promise)).toBe(false);
    expect(session.proposal!.promise.toLowerCase()).toMatch(/elia|stazione|03:17|fotograf|treno|madre|memor/i);
  });

  it("generates entity-driven blueprint and blocks writing until approval package", () => {
    let session = startOneFlowSession(STATION_IDEA, { genreHint: "Horror", language: "Italiano" });
    expect(canStartWritingFromSession(session)).toBe(false);

    const { session: ready, payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();
    expect(payload!.blueprintApproved).toBe(true);
    expect(payload!.mode).toBe("studio-approved");
    expect(isInvalidGeneratedTitle(payload!.config.title, STATION_IDEA)).toBe(false);

    const coverage = validateBlueprintEntityCoverage(payload!.blueprint!, STATION_IDEA, [
      "stazione",
      "fotografia",
      "madre",
      "treno",
      "donna",
      "memoria",
    ]);
    expect(coverage.pass, `Missing entities: ${coverage.missing.join(", ")}`).toBe(true);
    expect(payload!.blueprint!.chapterOutlines.some((o) => /normalità|crepa|escalation/i.test(o.title))).toBe(false);

    const draftProject = {
      id: "test",
      config: payload!.config,
      blueprint: payload!.blueprint,
      blueprintApproved: false,
      chapters: [],
      frontMatter: null,
      backMatter: null,
      phase: "blueprint" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(validateProjectGenerationReadiness(draftProject).some((i) => i.id === "blueprint-approval")).toBe(true);

    expect(canStartWritingFromSession(ready)).toBe(true);
  });

  it("applies conversational edit intents without parallel AI path", () => {
    const session = startOneFlowSession(STATION_IDEA, { genreHint: "Horror" });
    const darker = applyProposalEditIntent(session, "rendi il tono più oscuro e inquietante");
    expect(darker.proposal?.tone.toLowerCase()).toMatch(/oscuro|inquietant/);

    const commercial = applyProposalEditIntent(session, "titolo più commerciale");
    expect(isInvalidGeneratedTitle(commercial.proposal!.title, STATION_IDEA)).toBe(false);
  });
});
