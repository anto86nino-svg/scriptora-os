import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { buildAdvancedToolsAudit } from "./advanced-tools-audit";

function project(overrides: Partial<BookProject> = {}): BookProject {
  const repeated = [
    "Il metodo cominciava con una promessa concreta: scegliere un solo obiettivo, misurarlo ogni sera e correggere il piano prima di dormire, poi confrontare i risultati con una domanda semplice e verificabile.",
    "Il metodo cominciava con una promessa concreta: scegliere un solo obiettivo, misurarlo ogni sera e correggere il piano prima di dormire, poi confrontare i risultati con una domanda semplice e verificabile.",
  ];
  return {
    id: "audit-project",
    phase: "chapters",
    config: {
      title: "Metodo Chiaro",
      subtitle: "Un sistema pratico",
      language: "Italian",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Productivity",
      tone: "pratico",
      authorStyle: "editoriale",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 2,
      subchaptersEnabled: true,
      subchaptersPerChapter: 2,
      characters: [{ name: "Elena", role: "Mentor" }],
    } as BookProject["config"],
    blueprint: {
      overview: "Manuale pratico sul focus.",
      themes: ["focus"],
      emotionalArc: "Dalla confusione alla chiarezza.",
      chapterOutlines: [
        {
          title: "Fondazione",
          summary: "Costruire il primo sistema.",
          subchapters: [{ title: "Obiettivo", summary: "Definire" }, { title: "Misura", summary: "Misurare" }],
        },
        {
          title: "Routine",
          summary: "Applicare il sistema.",
          subchapters: [{ title: "Mattina", summary: "Preparare" }, { title: "Sera", summary: "Correggere" }],
        },
      ],
    },
    chapters: [
      { title: "Fondazione", content: repeated.join("\n\n"), subchapters: [{ title: "Obiettivo", content: "" }] },
      { title: "Routine", content: "Breve.", subchapters: [] },
    ],
    frontMatter: {} as BookProject["frontMatter"],
    backMatter: {} as BookProject["backMatter"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("advanced tools audit", () => {
  it("rileva duplicati, sottocapitoli vuoti e capitoli deboli con prove", () => {
    const audit = buildAdvancedToolsAudit(project());

    expect(audit).not.toBeNull();
    expect(audit!.warnings.duplicates.some((item) => item.title.includes("ripetuta"))).toBe(true);
    expect(audit!.warnings.subchapters.some((item) => item.id === "subchapter-missing")).toBe(true);
    expect(audit!.warnings.bookHealth.some((item) => item.title.includes("Capitolo debole"))).toBe(true);
    expect(audit!.repairPlan.length).toBeGreaterThan(0);
  });

  it("non inventa audit se manca il progetto", () => {
    expect(buildAdvancedToolsAudit(null)).toBeNull();
  });
});
