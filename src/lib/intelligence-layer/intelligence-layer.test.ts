import { describe, expect, it } from "vitest";
import { finalizeForgeForBlueprint } from "@/lib/guided-interview/forge-evolution-engine";
import { evolutionReadyGothicState } from "@/lib/guided-interview/evolution-test-fixture";
import type { BookProject } from "@/types/book";
import {
  consultIntelligenceLayer,
  getCoverStudioContext,
  getKdpLaunchContext,
  getRadarContext,
  getWriterEngineContext,
  resolveBookContext,
  resolveBookContextFromForge,
} from "./index";

function mockProject(): BookProject {
  const state = finalizeForgeForBlueprint(evolutionReadyGothicState());
  return {
    id: "proj-intel-1",
    config: {
      title: "La Villa dei Silenzi",
      subtitle: "Una verità sepolta",
      idea: state.extracted?.promise || "Romanzo gotico",
      language: "Italian",
      genre: "gothic",
      numberOfChapters: 12,
      tone: "Dark, atmospheric",
      authorName: "Test Author",
      characterBibleText: "CHARACTER TRUTH BLOCK",
      forgeCanonBrief: "BLUEPRINT CANON BRIEF",
      forgeStoryArchitecture: "STORY ARCHITECTURE",
      forgeAntiDriftRules: ["No rename drift"],
      characters: [{ name: "Elena", role: "Protagonista", wound: "Abbandono" }],
    } as BookProject["config"],
    blueprint: {
      overview: "Una donna torna nella villa della famiglia.",
      emotionalArc: "Dalla paura alla verità",
      chapterOutlines: [{ title: "Capitolo 1", summary: "Elena arriva alla villa." }],
    },
    chapters: [{ title: "Capitolo 1", content: "Elena entrò nella villa. Il silenzio la schiacciava.", subchapters: [] }],
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("intelligence layer", () => {
  it("resolves unified context from forge state", () => {
    const state = finalizeForgeForBlueprint(evolutionReadyGothicState());
    const context = resolveBookContextFromForge(state);

    expect(context.version).toBe(1);
    expect(context.sources).toContain("forge-state");
    expect(context.publishing.title).toBeTruthy();
    expect(context.characters.characters.length).toBeGreaterThan(0);
    expect(context.canon.facts.length).toBeGreaterThan(0);
  });

  it("resolves unified context from project with forge memory", () => {
    const project = mockProject();
    const context = resolveBookContext({ project, includeSignals: true });

    expect(context.sources).toContain("project");
    expect(context.completeness).not.toBe("minimal");
    expect(context.writerContextBlock).toContain("FORGE");
    expect(context.narrative.firstChapterExcerpt).toContain("Elena");
  });

  it("orchestrates writer context with canon warnings path", () => {
    const project = mockProject();
    const writer = getWriterEngineContext(project, { chapterIndex: 0 });

    expect(writer.consolidatedBlock).toContain("FORGE");
    expect(writer.context.publishing.title).toBe("La Villa dei Silenzi");
    expect(Array.isArray(writer.canonWarnings)).toBe(true);
  });

  it("provides module contexts without hard dependencies", () => {
    const project = mockProject();
    const cover = getCoverStudioContext(project);
    const kdp = getKdpLaunchContext(project);
    const radar = getRadarContext(project);

    expect(cover?.title).toBe("La Villa dei Silenzi");
    expect(kdp.genre).toBeTruthy();
    expect(radar.effectiveTitle).toBe("La Villa dei Silenzi");
    expect(radar.firstChapterText).toContain("Elena");
  });

  it("returns manuscript advisory via consultIntelligenceLayer", () => {
    const project = mockProject();
    const intel = consultIntelligenceLayer({
      project,
      chapterIndex: 0,
      chapterText: project.chapters[0].content,
    });

    expect(intel.manuscriptReport?.editorialSuggestions.length).toBeGreaterThan(0);
    expect(intel.context.editorialSignals.length + intel.context.narrativeSignals.length).toBeGreaterThan(0);
  });

  it("continues with minimal context when project is null", () => {
    const context = resolveBookContext({});
    expect(context.completeness).toBe("minimal");
    expect(context.publishing.title).toBe("");
  });
});
