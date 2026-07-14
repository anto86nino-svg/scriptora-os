import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookProject, Chapter } from "@/types/book";
import { useBookEngine } from "./useBookEngine";

const mocks = vi.hoisted(() => ({
  generateChapter: vi.fn(),
  fetchPlan: vi.fn(),
  continuity: vi.fn(),
  refreshLongMemory: vi.fn(),
  refreshMemoryGraph: vi.fn(),
}));

vi.mock("@/lib/generation-runtime", () => ({
  runGenerateBlueprint: vi.fn(),
  runGenerateFrontMatter: vi.fn(),
  runGenerateBackMatter: vi.fn(),
  runGenerateChapter: mocks.generateChapter,
  runGenerateChapterChunked: vi.fn(),
  runGenerateChapterViaSubchapterPipeline: vi.fn(),
  runGenerateSubchapter: vi.fn(),
  runRewriteChapter: vi.fn(),
  runEvaluateChapterQuality: vi.fn(),
}));

vi.mock("@/services/storageService", () => ({
  saveProjectAsync: vi.fn().mockResolvedValue(undefined),
  createProjectId: vi.fn(() => "generated-project"),
  setLastProjectId: vi.fn(),
  loadProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/storage", () => ({ saveProject: vi.fn() }));
vi.mock("@/lib/plan", () => ({ fetchPlan: mocks.fetchPlan }));
vi.mock("@/lib/dev-mode", () => ({ isDevMode: vi.fn(() => false) }));
vi.mock("@/lib/dev-plan-override", () => ({ getDevPlanOverride: vi.fn(() => "premium") }));
vi.mock("@/lib/intelligence-layer", () => ({
  consultIntelligenceLayer: vi.fn(),
  getWriterEngineContext: vi.fn(() => ({ consolidatedBlock: "", canonWarnings: [] })),
}));
vi.mock("@/lib/billing", () => ({
  buildCreditIdempotencyKey: vi.fn(() => "idempotency"),
  chargeChapterGeneration: vi.fn().mockResolvedValue("idempotency"),
  chargeRewriteChapter: vi.fn().mockResolvedValue("idempotency"),
  resolveChapterGenerationOperation: vi.fn(() => "generate_chapter_chunk"),
}));
vi.mock("@/lib/long-book-memory", () => ({
  refreshProjectLongBookMemory: mocks.refreshLongMemory,
}));
vi.mock("@/lib/memory-consistency-v25", () => ({
  isMemoryConsistencyV25Enabled: vi.fn(() => false),
  refreshProjectMemoryConsistencyV25: vi.fn((project: BookProject) => project),
}));
vi.mock("@/lib/memory-graph/graph-updater", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/memory-graph/graph-updater")>(),
  refreshProjectMemoryGraph: mocks.refreshMemoryGraph,
}));
vi.mock("@/lib/writer/narrative-continuity-gate", () => ({
  ensureChapterContinuityBeforeSave: mocks.continuity,
}));
vi.mock("@/lib/scriptora-logger", () => ({
  scriptoraLog: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

const freshText = Array.from({ length: 8 }, (_, index) =>
  `Nuova scena ${index + 1}: la protagonista attraversa il conflitto e prende una decisione concreta. ${"dettaglio narrativo ".repeat(10)}`,
).join("\n\n");

function makeProject(options: {
  id?: string;
  chapterCount?: number;
  subchapters?: boolean;
  firstChapterContent?: string;
} = {}): BookProject {
  const id = options.id || "regenerate-project";
  const chapterCount = options.chapterCount || 1;
  const subchapters = options.subchapters ?? true;
  const outlines = Array.from({ length: chapterCount }, (_, index) => ({
    title: index === 0 ? "La soglia inattesa" : `La scelta irreversibile ${index + 1}`,
    summary: `Il capitolo ${index + 1} sviluppa un conflitto concreto e conduce a una decisione irreversibile.`,
    subchapters: subchapters
      ? [
          { title: `Scena ${index + 1}.1`, summary: "L'evento rompe l'equilibrio iniziale." },
          { title: `Scena ${index + 1}.2`, summary: "La conseguenza obbliga a scegliere." },
        ]
      : undefined,
  }));
  const chapters: Chapter[] = Array.from({ length: chapterCount }, (_, index) => ({
    title: outlines[index]!.title,
    content: index === 0 && options.firstChapterContent !== undefined
      ? options.firstChapterContent
      : `Vecchio contenuto capitolo ${index + 1}. ${"passaggio precedente ".repeat(20)}`,
    subchapters: subchapters
      ? [
          { title: `Vecchio ${index + 1}.1`, content: `VECCHIO-A-${index} ${"testo obsoleto ".repeat(12)}` },
          { title: `Vecchio ${index + 1}.2`, content: `VECCHIO-B-${index} ${"testo obsoleto ".repeat(12)}` },
        ]
      : [],
    status: "completed",
    lastGenerationId: `${id}-old-${index}`,
  }));

  return {
    id,
    config: {
      title: `Romanzo ${id}`,
      subtitle: "",
      tone: "cinematic",
      authorStyle: "clean",
      language: "Italian",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: chapterCount,
      subchaptersEnabled: subchapters,
      subchaptersPerChapter: subchapters ? 2 : undefined,
      matterOptions: {
        frontMatterEnabled: false,
        backMatterEnabled: false,
        acknowledgmentsEnabled: false,
        ctaEnabled: false,
        bibliographyEnabled: false,
      },
    },
    blueprint: {
      overview: "Una storia di scelte e conseguenze.",
      themes: ["responsabilita"],
      emotionalArc: "Dall'incertezza alla decisione.",
      chapterOutlines: outlines,
    },
    chapters,
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("useBookEngine regenerate finalization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.generateChapter.mockReset();
    mocks.fetchPlan.mockReset().mockResolvedValue("premium");
    mocks.continuity.mockReset().mockImplementation(async (chapter: Chapter) => ({
      chapter,
      blocked: false,
      repaired: false,
      gate: { score: 98, criticalFailures: [] },
    }));
    mocks.refreshLongMemory.mockReset().mockImplementation((project: BookProject) => ({
      ...project,
      longBookMemory: { refreshedByRegenerateTest: true },
    }));
    mocks.refreshMemoryGraph.mockReset().mockImplementation((project: BookProject) => ({
      ...project,
      memoryGraph: { refreshedByRegenerateTest: true },
    }));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("rebuilds subchapters from the regenerated manuscript instead of retaining stale units", async () => {
    mocks.generateChapter.mockResolvedValue({
      title: "La soglia riscritta",
      content: freshText,
      subchapters: [],
    });
    const { result } = renderHook(() => useBookEngine());
    act(() => result.current.loadProject(makeProject({ subchapters: true })));

    await act(async () => { await result.current.regenerateChapter(0); });

    const chapter = result.current.project!.chapters[0];
    expect(chapter.subchapters).toHaveLength(2);
    expect(chapter.subchapters?.every((sub) => sub.content.length > 80)).toBe(true);
    expect(chapter.content).toContain("Nuova scena");
    expect(chapter.content).not.toContain("VECCHIO-");
    expect(chapter.subchapters?.map((sub) => sub.content).join(" ")).not.toContain("VECCHIO-");
  });

  it("runs continuity, refreshes narrative memory and advances the final chapter phase", async () => {
    const generated: Chapter = {
      title: "La soglia riscritta",
      content: freshText,
      subchapters: [
        { title: "Evento", content: `La porta si apre. ${"La tensione cresce e cambia la scena. ".repeat(8)}` },
        { title: "Decisione", content: `Lei sceglie di restare. ${"La conseguenza emotiva diventa concreta. ".repeat(8)}` },
      ],
    };
    mocks.generateChapter.mockResolvedValue(generated);
    const { result } = renderHook(() => useBookEngine());
    act(() => result.current.loadProject(makeProject({ subchapters: true })));

    await act(async () => { await result.current.regenerateChapter(0); });

    expect(mocks.continuity).toHaveBeenCalledTimes(1);
    expect(mocks.refreshLongMemory).toHaveBeenCalledTimes(1);
    expect(mocks.refreshMemoryGraph).toHaveBeenCalledTimes(1);
    expect((result.current.project?.longBookMemory as any)?.refreshedByRegenerateTest).toBe(true);
    expect((result.current.project?.memoryGraph as any)?.refreshedByRegenerateTest).toBe(true);
    expect(result.current.project?.phase).toBe("complete");
    expect(result.current.project?.chapters[0].status).toBe("completed");
  });

  it("applies the active plan word cap before saving the regenerated chapter", async () => {
    mocks.fetchPlan.mockResolvedValue("free");
    mocks.generateChapter.mockResolvedValue({ title: "Capitolo limitato", content: "nuova ".repeat(120), subchapters: [] });
    const almostFullBook = makeProject({
      chapterCount: 2,
      subchapters: false,
      firstChapterContent: "esistente ".repeat(9_980),
    });
    const { result } = renderHook(() => useBookEngine());
    act(() => result.current.loadProject(almostFullBook));

    await act(async () => { await result.current.regenerateChapter(1); });

    const regenerated = result.current.project!.chapters[1].content;
    expect(regenerated.trim().split(/\s+/)).toHaveLength(20);
    expect(regenerated).toContain("[Limite parole del piano raggiunto.]");
  });

  it("does not count assembled chapter content and its mirrored subchapters twice", async () => {
    mocks.fetchPlan.mockResolvedValue("free");
    mocks.generateChapter.mockResolvedValue({ title: "Capitolo limitato", content: "nuova ".repeat(120), subchapters: [] });
    const almostFullBook = makeProject({
      chapterCount: 2,
      subchapters: true,
      firstChapterContent: "esistente ".repeat(9_980),
    });
    almostFullBook.chapters[1] = {
      ...almostFullBook.chapters[1],
      content: "",
      subchapters: [],
    };
    const { result } = renderHook(() => useBookEngine());
    act(() => result.current.loadProject(almostFullBook));

    await act(async () => { await result.current.regenerateChapter(1); });

    const regenerated = result.current.project!.chapters[1].content;
    expect(mocks.generateChapter).toHaveBeenCalledTimes(1);
    expect(regenerated.trim().split(/\s+/)).toHaveLength(20);
    expect(regenerated).toContain("[Limite parole del piano raggiunto.]");
  });

  it("uses subchapter words as the fallback when assembled chapter content is missing", async () => {
    mocks.fetchPlan.mockResolvedValue("free");
    mocks.generateChapter.mockResolvedValue({ title: "Capitolo oltre limite", content: "nuova ".repeat(120), subchapters: [] });
    const fullBook = makeProject({
      chapterCount: 2,
      subchapters: true,
      firstChapterContent: "",
    });
    fullBook.chapters[0].subchapters = [
      { title: "Scena 1.1", content: "sottocapitolo ".repeat(5_000) },
      { title: "Scena 1.2", content: "sottocapitolo ".repeat(5_000) },
    ];
    fullBook.chapters[1] = {
      ...fullBook.chapters[1],
      content: "",
      subchapters: [],
    };
    const { result } = renderHook(() => useBookEngine());
    act(() => result.current.loadProject(fullBook));

    await act(async () => { await result.current.regenerateChapter(1); });

    expect(mocks.generateChapter).toHaveBeenCalledTimes(1);
    expect(result.current.project!.chapters[1].content).toBe("");
  });

  it("does not finalize into a project opened while regeneration is in flight", async () => {
    const pending = deferred<Chapter>();
    mocks.generateChapter.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useBookEngine());
    let regeneration!: Promise<void>;
    act(() => result.current.loadProject(makeProject({ id: "A" })));
    act(() => { regeneration = result.current.regenerateChapter(0); });
    await act(async () => { await Promise.resolve(); });
    act(() => result.current.loadProject(makeProject({ id: "B" })));

    await act(async () => {
      pending.resolve({ title: "Stale", content: freshText, subchapters: [] });
      await regeneration;
    });

    expect(result.current.project?.id).toBe("B");
    expect(result.current.project?.chapters[0].content).toContain("Vecchio contenuto");
    expect(mocks.refreshLongMemory).not.toHaveBeenCalled();
  });
});
