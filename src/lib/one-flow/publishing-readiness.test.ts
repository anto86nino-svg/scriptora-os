import { beforeEach, describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { setProjectCoverComposition, setProjectCoverDataUrl } from "@/lib/cover-session";
import { saveKdpLaunchSession } from "@/lib/kdp/kdp-launch-session";
import { saveRadarSnapshot } from "@/lib/bestseller-radar/radar-storage";
import { buildPublishingReadinessAudit } from "./publishing-readiness";

function text(words = 120): string {
  return Array.from({ length: words }, (_, i) => `parola${i}`).join(" ");
}

function project(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "publishing-project",
    phase: "complete",
    config: {
      title: "Metodo Focus Profondo",
      subtitle: "Un sistema pratico per ritrovare chiarezza ogni giorno",
      language: "Italian",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Productivity",
      subgenre: "Focus",
      tone: "pratico",
      author: "Livia Rossi",
      authorStyle: "editoriale",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 2,
      subchaptersEnabled: false,
      characters: [],
    } as BookProject["config"],
    blueprint: {
      overview: "Manuale pratico sul focus.",
      themes: ["focus"],
      emotionalArc: "Dalla confusione alla chiarezza.",
      chapterOutlines: [
        { title: "Fondazione", summary: "Costruire il primo sistema." },
        { title: "Routine", summary: "Applicare il sistema." },
      ],
    },
    chapters: [
      { title: "Fondazione", content: text(), subchapters: [] },
      { title: "Routine", content: text(), subchapters: [] },
    ],
    frontMatter: {
      titlePage: "Metodo Focus Profondo",
      copyright: "Copyright 2026 Livia Rossi",
      dedication: "",
      aboutAuthor: "Livia Rossi e' un'autrice.",
      howToUse: "",
      letterToReader: "",
    },
    backMatter: {
      conclusion: "Conclusione.",
      authorNote: "Nota autore.",
      callToAction: "Lascia una recensione.",
      reviewRequest: "Grazie.",
      otherBooks: "",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedPublishingSignals(projectId = "publishing-project") {
  setProjectCoverDataUrl(projectId, "data:image/png;base64,ZmFrZQ==");
  setProjectCoverComposition(projectId, JSON.stringify({
    backgroundPresetId: "clean",
    layers: [
      { id: "title", type: "title", content: "Metodo Focus Profondo", x: 50, y: 28, style: { fontSize: 92 } },
      { id: "author", type: "author", content: "Livia Rossi", x: 50, y: 84, style: { fontSize: 74 } },
    ],
  }));
  saveKdpLaunchSession({
    sessionId: "publishing-session",
    projectId,
    currentStep: "packaging",
    config: {
      idea: "focus profondo per professionisti",
      genre: "Self-help",
      language: "Italian",
      chosenTitle: "Metodo Focus Profondo",
      chosenSubtitle: "Un sistema pratico per ritrovare chiarezza ogni giorno",
    },
    analysis: null,
    titles: null,
    packaging: {
      amazonDescription: "Descrizione KDP",
      backendKeywords: ["focus profondo", "produttivita consapevole", "chiarezza mentale", "abitudini sane", "gestione attenzione"],
      categories: ["Self-Help > Personal Growth", "Business > Time Management"],
      bulletPoints: ["Sistema pratico"],
    },
    prediction: null,
    narrativeFlow: null,
    status: "done",
    updatedAt: new Date().toISOString(),
    dirty: false,
  });
  saveRadarSnapshot({
    id: "radar-1",
    projectId,
    createdAt: new Date().toISOString(),
    score: {
      overall: 86,
      hookStrength: 84,
      titlePower: 88,
      marketFit: 82,
      genreClarity: 90,
      readerPromise: 86,
      bingeability: 76,
      emotionalPull: 78,
      kdpPositioning: 85,
      booktokPotential: 72,
      competitionRisk: 58,
      publishReadiness: 84,
    },
    confidence: "high",
    mode: "project-based",
    verdict: "Pronto con verifica finale.",
    strengths: ["Titolo chiaro"],
    risks: [],
    growthLevers: [],
    actions: [{ priority: "low", title: "Verifica finale", reason: "Proof", targetModule: "export", ctaLabel: "Export" }],
    missingData: [],
    scanLog: ["Snapshot test"],
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("publishing readiness audit", () => {
  it("non inventa un cockpit senza progetto attivo", () => {
    expect(buildPublishingReadinessAudit(null)).toBeNull();
  });

  it("mantiene CRITICAL quando mancano dati pubblicativi reali", () => {
    const audit = buildPublishingReadinessAudit(project({
      config: { ...project().config, title: "", author: "" },
      frontMatter: null,
      backMatter: null,
    }));

    expect(audit?.status).toBe("CRITICAL");
    expect(audit?.plan.some((item) => item.problem.includes("Titolo"))).toBe(true);
    expect(audit?.steps.find((step) => step.id === "cover")?.status).toBe("CRITICAL");
    expect(localStorage.getItem("scriptora:kdp-launch-active-session")).toBeNull();
  });

  it("usa segnali reali di cover, KDP e radar per alzare la readiness", () => {
    seedPublishingSignals();
    const audit = buildPublishingReadinessAudit(project());

    expect(audit?.signals.hasCover).toBe(true);
    expect(audit?.signals.hasCoverComposition).toBe(true);
    expect(audit?.signals.hasKdpPackaging).toBe(true);
    expect(audit?.signals.hasRadarSnapshot).toBe(true);
    expect(audit?.score).toBeGreaterThanOrEqual(82);
    expect(audit?.status).toBe("READY");
  });

  it("legge keyword e categorie salvate nel progetto anche senza sessione KDP attiva", () => {
    const audit = buildPublishingReadinessAudit(project({
      config: {
        ...project().config,
        publishingMetadata: {
          backendKeywords: ["focus profondo", "gestione attenzione", "chiarezza mentale", "routine focus", "produttivita calma"],
          kdpCategories: ["Self-Help > Personal Growth", "Business > Time Management"],
          sourceTools: ["keyword-gold"],
        },
      },
    }));

    expect(audit?.signals.hasKdpPackaging).toBe(true);
    expect(audit?.steps.find((step) => step.id === "keyword")?.checks.find((check) => check.id === "keyword-count")?.status).toBe("PASS");
    expect(audit?.steps.find((step) => step.id === "kdp")?.checks.find((check) => check.id === "kdp-packaging")?.status).toBe("PASS");
  });
});
