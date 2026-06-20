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
    expect(audit!.manuscriptAudit.steps.map((step) => step.id)).toEqual([
      "subchapter-coverage",
      "character-consistency",
      "narrative-promise-tracker",
      "repetition-audit",
      "blueprint-coverage",
    ]);
    expect(audit!.manuscriptAudit.subchapterCoverage[0].missing).toContain("Obiettivo");
    expect(audit!.manuscriptAudit.steps.find((step) => step.id === "subchapter-coverage")?.status).toBe("FAIL");
    expect(audit!.manuscriptAudit.characterConsistency.missingCharacters).toContain("Elena");
    expect(audit!.manuscriptAudit.blueprintCoverage.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(audit!.repairPlan.length).toBeGreaterThan(0);
  });

  it("confronta personaggi blueprint e manoscritto senza mascherare entita contaminate", () => {
    const audit = buildAdvancedToolsAudit(project({
      chapters: [
        {
          title: "Fondazione",
          content: [
            "Elena apri il quaderno e fisso l'obiettivo con calma.",
            "Damien comparve sulla soglia senza appartenere al blueprint.",
            "Damien ripeteva una promessa che nessuno aveva introdotto.",
          ].join("\n\n"),
          subchapters: [
            { title: "Obiettivo", content: "Elena definisce un obiettivo misurabile con una routine concreta e verificabile." },
            { title: "Misura", content: "La misura serale conferma se il sistema funziona davvero o se va corretto." },
          ],
        },
        { title: "Routine", content: "Breve.", subchapters: [] },
      ],
    }));

    expect(audit!.manuscriptAudit.characterConsistency.presentCharacters).toContain("Elena");
    expect(audit!.manuscriptAudit.characterConsistency.manuscriptOnlyCharacters).toContain("Damien");
    expect(audit!.manuscriptAudit.steps.find((step) => step.id === "character-consistency")?.status).toBe("FAIL");
  });

  it("traccia promesse narrative aperte e pattern ripetuti con dati reali", () => {
    const audit = buildAdvancedToolsAudit(project({
      longBookMemory: {
        version: 2,
        updatedAt: new Date().toISOString(),
        chaptersIndexed: 1,
        unresolvedArcs: [{ id: "arc-1", description: "Chi ha lasciato la chiave sul tavolo", introducedChapter: 1, urgency: "high", type: "mystery" }],
        characterStates: [],
        emotionalProgression: [],
        foreshadowing: [{ seed: "chiave arrugginita", chapter: 1, payoffStatus: "open" }],
        promisePayoffs: [{ promise: "La chiave avra' un payoff", chapterIntroduced: 1, status: "open" }],
        relationshipStates: [],
        worldRules: [],
        continuityAnchors: [],
      },
      chapters: [
        {
          title: "Fondazione",
          content: [
            "Elena guardo la chiave come se la stanza trattenesse il respiro.",
            "Elena torno alla chiave come se la stanza trattenesse il respiro.",
            "Non disse niente. Non disse niente. Non disse niente. Non disse niente. Non disse niente.",
          ].join("\n\n"),
          subchapters: [],
        },
        { title: "Routine", content: "Breve.", subchapters: [] },
      ],
    }));

    expect(audit!.manuscriptAudit.narrativePromiseTracker.unresolvedPromises).toContain("La chiave avra' un payoff (open)");
    expect(audit!.manuscriptAudit.narrativePromiseTracker.openQuestions).toContain("Chi ha lasciato la chiave sul tavolo");
    expect(audit!.manuscriptAudit.repetitionAudit.metaphors.length).toBeGreaterThan(0);
    expect(audit!.manuscriptAudit.repetitionAudit.gestures.some((line) => /silenzio/i.test(line))).toBe(true);
  });

  it("non inventa audit se manca il progetto", () => {
    expect(buildAdvancedToolsAudit(null)).toBeNull();
  });
});
