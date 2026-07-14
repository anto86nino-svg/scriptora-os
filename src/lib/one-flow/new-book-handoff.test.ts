import { describe, expect, it, vi } from "vitest";
import type { BookBlueprint, BookConfig, BookProject } from "@/types/book";
import {
  consumeNewBookHandoff,
  NEW_BOOK_HANDOFF_STORAGE_KEY,
  type NewBookHandoffEngine,
} from "./new-book-handoff";

const config = { title: "Libro test" } as BookConfig;
const blueprint = {
  overview: "Struttura",
  themes: [],
  emotionalArc: "",
  chapterOutlines: [{ title: "Capitolo 1", summary: "Inizio" }],
} as BookBlueprint;
const project = {
  id: "preview-1",
  config,
  blueprint,
  chapters: [],
  frontMatter: null,
  backMatter: null,
  phase: "blueprint",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as BookProject;

function engine(overrides: Partial<NewBookHandoffEngine> = {}): NewBookHandoffEngine {
  return {
    createProjectWithApprovedBlueprint: vi.fn(async () => project),
    createProjectDraft: vi.fn(async () => project),
    startNewBook: vi.fn(async () => project),
    ...overrides,
  };
}

describe("new book session handoff", () => {
  it("awaits approved-project creation and removes the payload only after success", async () => {
    let resolveCreation: (value: BookProject | null) => void = () => undefined;
    const creation = new Promise<BookProject | null>((resolve) => {
      resolveCreation = resolve;
    });
    const createApproved = vi.fn(() => creation);
    const handoffEngine = engine({ createProjectWithApprovedBlueprint: createApproved });

    sessionStorage.setItem(NEW_BOOK_HANDOFF_STORAGE_KEY, JSON.stringify({
      mode: "studio-approved",
      config,
      blueprint,
      blueprintSource: "ai",
      projectId: project.id,
    }));

    const consuming = consumeNewBookHandoff(sessionStorage, handoffEngine);
    await Promise.resolve();
    expect(sessionStorage.getItem(NEW_BOOK_HANDOFF_STORAGE_KEY)).not.toBeNull();

    resolveCreation(project);
    await expect(consuming).resolves.toEqual({ handled: true, project });
    expect(sessionStorage.getItem(NEW_BOOK_HANDOFF_STORAGE_KEY)).toBeNull();
    expect(createApproved).toHaveBeenCalledWith(config, blueprint, "ai", project.id);
  });

  it("keeps the payload when project creation is rejected by a gate", async () => {
    const handoffEngine = engine({
      createProjectWithApprovedBlueprint: vi.fn(async () => null),
    });
    const raw = JSON.stringify({ mode: "studio-approved", config, blueprint, projectId: project.id });
    sessionStorage.setItem(NEW_BOOK_HANDOFF_STORAGE_KEY, raw);

    await expect(consumeNewBookHandoff(sessionStorage, handoffEngine)).rejects.toThrow(/dati sono al sicuro/i);
    expect(sessionStorage.getItem(NEW_BOOK_HANDOFF_STORAGE_KEY)).toBe(raw);
  });

  it("keeps malformed payloads available for diagnosis and retry", async () => {
    sessionStorage.setItem(NEW_BOOK_HANDOFF_STORAGE_KEY, "{invalid-json");

    await expect(consumeNewBookHandoff(sessionStorage, engine())).rejects.toBeInstanceOf(SyntaxError);
    expect(sessionStorage.getItem(NEW_BOOK_HANDOFF_STORAGE_KEY)).toBe("{invalid-json");
  });
});
