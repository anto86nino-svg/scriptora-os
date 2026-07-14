import type { BookBlueprint, BookConfig, BookProject } from "@/types/book";

export const NEW_BOOK_HANDOFF_STORAGE_KEY = "scriptora-new-book";

export interface NewBookHandoffEngine {
  createProjectWithApprovedBlueprint: (
    config: BookConfig,
    blueprint: BookBlueprint,
    source?: BookProject["blueprintSource"],
    projectId?: string,
  ) => Promise<BookProject | null>;
  createProjectDraft: (config: BookConfig) => Promise<BookProject | null>;
  startNewBook: (config: BookConfig) => Promise<BookProject | null>;
}

export interface NewBookHandoffResult {
  handled: boolean;
  project: BookProject | null;
}

export async function consumeNewBookHandoff(
  storage: Storage,
  engine: NewBookHandoffEngine,
): Promise<NewBookHandoffResult> {
  const raw = storage.getItem(NEW_BOOK_HANDOFF_STORAGE_KEY);
  if (!raw) return { handled: false, project: null };

  const payload = JSON.parse(raw);
  let project: BookProject | null;

  if (payload?.mode === "studio-approved" && payload.config && payload.blueprint) {
    project = await engine.createProjectWithApprovedBlueprint(
      payload.config,
      payload.blueprint,
      payload.blueprintSource || "ai",
      payload.projectId,
    );
  } else if (payload?.mode === "studio-draft" && payload.config) {
    project = await engine.createProjectDraft(payload.config);
  } else if (payload?.config) {
    project = await engine.startNewBook(payload.config);
  } else {
    project = await engine.startNewBook(payload);
  }

  if (!project) {
    throw new Error("Non sono riuscito ad aprire il nuovo libro. I dati sono al sicuro: ricarica la pagina per riprovare.");
  }

  storage.removeItem(NEW_BOOK_HANDOFF_STORAGE_KEY);
  return { handled: true, project };
}
