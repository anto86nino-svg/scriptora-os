import { describe, expect, it, beforeEach } from "vitest";
import type { BookProject } from "@/types/book";
import {
  loadTrashEntries,
  purgeExpiredTrash,
  recoverProjectFromTrash,
  softDeleteProjectAsync,
  TRASH_RECOVERY_DAYS,
} from "./project-trash";

const sampleProject = (): BookProject =>
  ({
    id: "proj-trash-1",
    config: { title: "Test Book", genre: "thriller", language: "Italian" },
    chapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as BookProject;

describe("project-trash", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("soft deletes and keeps entry recoverable", async () => {
    const project = sampleProject();
    await softDeleteProjectAsync(project);
    const entries = loadTrashEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].project.id).toBe(project.id);
  });

  it("recovers project from trash", async () => {
    const project = sampleProject();
    await softDeleteProjectAsync(project);
    const ok = await recoverProjectFromTrash(project.id);
    expect(ok).toBe(true);
    expect(loadTrashEntries()).toHaveLength(0);
  });

  it("purges entries older than recovery window", () => {
    const project = sampleProject();
    const stale = new Date(Date.now() - (TRASH_RECOVERY_DAYS + 1) * 86400000).toISOString();
    localStorage.setItem(
      "scriptora-project-trash-v1",
      JSON.stringify([{ project, deletedAt: stale }]),
    );
    const kept = purgeExpiredTrash();
    expect(kept).toHaveLength(0);
  });
});
