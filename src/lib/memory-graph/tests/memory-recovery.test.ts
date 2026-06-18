import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { buildMemoryGraphFromProject } from "@/lib/memory-graph/graph-builder";
import { computeStoryDebt } from "@/lib/memory-graph/selectors/story-debt";
import { runPreChapterMemoryCheck } from "@/lib/memory-graph/graph-recovery";
import { updateMemoryGraphAfterChapter } from "@/lib/memory-graph/graph-updater";
import { analyzeCanonDrift } from "@/lib/memory-graph/graph-validator";
import { RecoveryEngine } from "@/lib/recovery-engine";

const SAMPLE_CHAPTER_CONTENT =
  "Marco Rossi attraversò il vicolo bagnato con il cappotto consumato dal tempo. " +
  "La pioggia batteva sul selciato mentre un lampo lontano illuminava la finestra rotta. " +
  "Da anni inseguiva quella verità, e quella notte sentiva che il passato stava per parlare. " +
  "Ogni passo risuonava come un promemoria del giuramento fatto alla sorella scomparsa. " +
  "Il vicolo odorava di ruggine, paura e segreti che nessuno aveva mai osato confessare ad alta voce.";

function sampleProject(): BookProject {
  return {
    id: "proj-memory-test",
    config: {
      title: "Test Book",
      subtitle: "",
      genre: "thriller",
      language: "Italian",
      tone: "dark",
      numberOfChapters: 3,
      chapterLength: "medium",
      bookLength: "short",
      matterOptions: {
        frontMatterEnabled: false,
        backMatterEnabled: false,
        acknowledgmentsEnabled: false,
        ctaEnabled: false,
        bibliographyEnabled: false,
      },
      characterBibleText: "Marco Rossi — detective ossessionato dal passato.",
      forgeCanonBrief: "Roma contemporanea, tono noir.",
    },
    blueprint: {
      overview: "Un detective cerca la verità su un omicidio irrisolto.",
      chapterOutlines: [
        { title: "La scena", summary: "Marco trova un indizio nel vicolo." },
        { title: "Il sospetto", summary: "Un testimone mente sui tempi." },
        { title: "La verità", summary: "Il segreto familiare emerge." },
      ],
      themes: ["verità", "colpa"],
      emotionalArc: "dalla negazione alla accettazione",
    },
    frontMatter: null,
    chapters: [
      { title: "La scena", content: SAMPLE_CHAPTER_CONTENT, subchapters: [], status: "completed" },
      { title: "Il sospetto", content: "", subchapters: [], status: "idle" },
      { title: "La verità", content: "", subchapters: [], status: "idle" },
    ],
    backMatter: null,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("memory-graph", () => {
  it("builds graph from project with promises and world nodes", () => {
    const graph = buildMemoryGraphFromProject(sampleProject());
    expect(graph.characters.length).toBeGreaterThanOrEqual(0);
    expect(graph.promises.length).toBeGreaterThanOrEqual(2);
    expect(graph.world.some((w) => w.label.includes("Character bible") || w.kind === "rule")).toBe(true);
  });

  it("computes story debt from open promises", () => {
    const graph = buildMemoryGraphFromProject(sampleProject());
    const debt = computeStoryDebt(graph);
    expect(debt.narrativeDebtScore).toBeGreaterThan(0);
    expect(debt.unresolvedPromises.length).toBeGreaterThan(0);
  });

  it("runs pre-chapter memory check without blocking", () => {
    const project = sampleProject();
    const ctx = runPreChapterMemoryCheck({ project, chapterIndex: 1 });
    expect(ctx.snapshot.projectId).toBe(project.id);
    expect(ctx.writerContextBlock).toContain("MEMORY GRAPH");
    expect(ctx.warnings).toBeInstanceOf(Array);
  });

  it("updates graph after chapter and preserves drift report", () => {
    const project = sampleProject();
    const result = updateMemoryGraphAfterChapter(
      project,
      0,
      project.chapters[0].content,
      buildMemoryGraphFromProject(project),
    );
    expect(result.snapshot.chaptersIndexed).toBeGreaterThanOrEqual(1);
    expect(result.driftReport.status).toBeDefined();
    expect(result.debtScore).toBeGreaterThanOrEqual(0);
  });

  it("detects stale critical promises in canon drift", () => {
    const graph = buildMemoryGraphFromProject(sampleProject());
    graph.promises.push({
      id: "promise-critical",
      label: "Identità assassino",
      description: "Chi ha ucciso la sorella di Marco?",
      introducedIn: 0,
      importance: "critical",
      status: "open",
    });
    const drift = analyzeCanonDrift(graph, { chapterIndex: 10, draftText: "testo senza nomi" });
    expect(drift.issues.some((i) => i.category === "promise")).toBe(true);
  });
});

describe("recovery-engine", () => {
  it("classifies partial success instead of empty failure", () => {
    const partial = RecoveryEngine.classifyPartialSuccess("word ".repeat(40));
    expect(partial.status).toBe("recovered_partial");
    expect(partial.body).toContain("recuperato");
  });

  it("never treats substantial content as failed_empty", () => {
    const content = "parola ".repeat(150);
    expect(RecoveryEngine.hasRecoverableContent(content)).toBe(true);
    expect(RecoveryEngine.classifyPartialSuccess(content).status).toBe("completed_with_warning");
  });

  it("recovers missing blueprint without discarding valid chapters", () => {
    const project = { ...sampleProject(), blueprint: null };
    const result = RecoveryEngine.recoverProject(project);
    expect(result.restoredProject?.blueprint).toBeTruthy();
    expect(result.restoredProject?.chapters[0].content).toContain("Marco Rossi");
    expect(result.analysis.recoverable).toBe(true);
  });
});
