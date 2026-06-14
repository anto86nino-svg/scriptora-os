import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { runBestsellerRadarEngine } from "./radar-engine";
import { honestyBadgeLabel } from "./radar-copy";
import { computeRadarDelta, saveRadarSnapshot, loadLatestRadarSnapshot } from "./radar-storage";
import type { RadarEngineInput } from "./radar-adapters";

function baseProject(overrides: Partial<BookProject["config"]> = {}): BookProject {
  return {
    id: "proj-radar-test",
    config: {
      title: "Quando il silenzio brucia",
      subtitle: "Una dark romance che non chiede permesso",
      idea: "Rivalità e desiderio proibito tra nemici di famiglia",
      genre: "dark-romance",
      category: "Fiction",
      subcategory: "Dark romance",
      language: "Italian",
      tone: "intense",
      authorStyle: "emotional",
      targetReader: "Lettrici 20-35 BookTok",
      chapterLength: "medium",
      bookLength: "long",
      numberOfChapters: 20,
      subchaptersEnabled: false,
      ...overrides,
    },
    blueprint: {
      overview: "Premessa: desiderio proibito e vendetta familiare.",
      emotionalArc: "Tensione → vulnerabilità → scelta irreversibile",
      themes: ["desire", "betrayal"],
      chapterOutlines: [
        { title: "La porta sbagliata", summary: "Hook sensoriale e minaccia immediata." },
        { title: "Nemici", summary: "Conflitto visibile entro 3 pagine." },
      ],
    },
    frontMatter: null,
    chapters: [{
      title: "La porta sbagliata",
      content: `La porta era più fredda del corridoio. Marco non la guardò quando disse: "Non dovresti essere qui."
      Lei trattenne il fiato. Il pericolo non era lui — era ciò che stava per scegliere.
      Quando l'ascensore si riaprì, la domanda non era più se fuggire, ma cosa sarebbe costato restare.`,
      subchapters: [],
    }],
    backMatter: null,
    phase: "chapters",
  };
}

function runWith(input: Partial<RadarEngineInput>) {
  return runBestsellerRadarEngine({
    project: null,
    kdp: null,
    titleDomination: null,
    hasCover: false,
    italian: true,
    ...input,
  });
}

describe("Bestseller Radar Engine", () => {
  it("scores dark romance project with manuscript higher than weak title", () => {
    const strong = runWith({ project: baseProject() });
    const weak = runWith({ project: baseProject({ title: "Libro", subtitle: "Guida generica", idea: "Crescita personale" }) });
    expect(strong.score.overall).toBeGreaterThan(weak.score.overall);
    expect(strong.score.hookStrength).toBeGreaterThan(40);
  });

  it("scores horror project with tension signals", () => {
    const horror = runWith({
      project: baseProject({
        genre: "horror",
        title: "La casa che respira",
        subtitle: "Nessuno esce con la stessa pelle",
        category: "Horror",
        subcategory: "Psychological horror",
      }),
    });
    expect(horror.score.genreClarity).toBeGreaterThan(50);
    expect(horror.verdict.length).toBeGreaterThan(20);
  });

  it("handles self-help with practical promise", () => {
    const selfhelp = runWith({
      project: baseProject({
        genre: "self-help",
        title: "30 giorni senza procrastinare",
        subtitle: "Metodo pratico per imprenditori in burnout",
        category: "Self-help",
        subcategory: "Productivity",
        targetReader: "Imprenditori 30-45",
      }),
    });
    expect(selfhelp.score.readerPromise).toBeGreaterThan(45);
    expect(selfhelp.score.booktokPotential).toBeLessThan(90);
  });

  it("lowers confidence without KDP Launch", () => {
    const res = runWith({ project: baseProject() });
    expect(res.missingData.some((m) => /kdp|analisi/i.test(m))).toBe(true);
    expect(res.mode).toBe("estimated");
    expect(res.confidence).not.toBe("high");
  });

  it("flags missing title", () => {
    const res = runWith({ project: baseProject({ title: "" }) });
    expect(res.missingData).toContain("title");
    expect(res.actions.some((a) => a.targetModule === "title-domination")).toBe(true);
  });

  it("uses KDP analysis when present", () => {
    const res = runWith({
      project: baseProject(),
      kdp: {
        analysis: {
          nicheScore: 7.5,
          demandLevel: "high",
          competitionLevel: "medium",
          profitabilityScore: 8,
          recommendedAngle: "Dark romance con rivalità familiare",
          subNiche: "enemies-to-lovers italiano",
        },
        packaging: {
          amazonDescription: "desc",
          backendKeywords: ["dark romance", "enemies", "italiano", "burn", "forbidden"],
          categories: ["Fiction > Romance > Suspense", "Fiction > Romance > Contemporary"],
          bulletPoints: ["a", "b", "c", "d", "e"],
        },
        titles: null,
        chosenTitle: "Quando il silenzio brucia",
        chosenSubtitle: "Una dark romance che non chiede permesso",
      },
    });
    expect(res.mode).toBe("analysis-based");
    expect(res.score.kdpPositioning).toBeGreaterThan(55);
    expect(res.actions.some((a) => a.targetModule === "kdp-launch")).toBe(false);
  });

  it("penalizes strong title with weak category via actions", () => {
    const res = runWith({
      project: baseProject({
        title: "Bacio Proibito ai Confini del Mare",
        subtitle: "Una storia di desiderio e vendetta",
        category: "",
        subcategory: "",
      }),
    });
    expect(res.score.titlePower).toBeGreaterThan(55);
    expect(res.actions.length).toBeGreaterThan(0);
  });

  it("computes snapshot delta", () => {
    expect(computeRadarDelta(76, 68)).toBe(8);
    expect(computeRadarDelta(76, null)).toBeNull();
  });

  it("shows honesty badge for estimated mode", () => {
    expect(honestyBadgeLabel("estimated", true)).toBe("Stimato");
    expect(honestyBadgeLabel("analysis-based", false)).toBe("KDP analysis-based");
  });

  it("persists and reloads snapshot history", () => {
    const projectId = "proj-storage-test";
    const snap = runWith({ project: { ...baseProject(), id: projectId } });
    saveRadarSnapshot({ ...snap, projectId });
    const loaded = loadLatestRadarSnapshot(projectId);
    expect(loaded?.score.overall).toBe(snap.score.overall);
  });
});
