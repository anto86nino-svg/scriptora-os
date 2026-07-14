import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { mergeProjectsByFreshness } from "./storageService";

function project(id: string, title: string, updatedAt: string): BookProject {
  return {
    id,
    updatedAt,
    config: { title },
  } as BookProject;
}

describe("mergeProjectsByFreshness", () => {
  it("keeps the newest revision for each project without dropping other books", () => {
    const local = [
      project("a", "A locale nuova", "2026-07-13T10:00:00.000Z"),
      project("local-only", "Solo locale", "2026-07-13T09:00:00.000Z"),
    ];
    const cloud = [
      project("a", "A cloud vecchia", "2026-07-12T10:00:00.000Z"),
      project("cloud-only", "Solo cloud", "2026-07-11T10:00:00.000Z"),
    ];

    const merged = mergeProjectsByFreshness(local, cloud);

    expect(merged.map((item) => item.id)).toEqual(["a", "local-only", "cloud-only"]);
    expect(merged.find((item) => item.id === "a")?.config.title).toBe("A locale nuova");
  });

  it("keeps the cloud revision when it is newer", () => {
    const merged = mergeProjectsByFreshness(
      [project("a", "Locale vecchia", "2026-07-12T10:00:00.000Z")],
      [project("a", "Cloud nuova", "2026-07-13T10:00:00.000Z")],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.config.title).toBe("Cloud nuova");
  });
});
