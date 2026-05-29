import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { detectBookIntelligence } from "@/lib/book-intelligence";
import type { AuthorIdentity } from "@/types/book";
import { applyPassiveMarketCopyTone } from "@/lib/author-brain/passive-intelligence";

export type ReadinessTier = "weak" | "developing" | "strong" | "highly-competitive";
export type Severity = "low" | "medium" | "high";
export type CommercialMomentum = "low" | "medium" | "strong" | "high";

export interface ReadinessFactor {
  label: string;
  score: number;
  weight: number;
}

export interface DropRiskPoint {
  chapter: number;
  title: string;
  severity: Severity;
  message: string;
}

export interface HookIntelligence {
  openingScore: number;
  chapterOneScore: number;
  explanation: string;
  flags: string[];
}

export interface GenreExpectationResult {
  aligned: boolean;
  severity: Severity;
  message: string;
  nicheNote: string;
}

export interface ManuscriptPublishingIntel {
  marketReadiness: {
    score: number;
    tier: ReadinessTier;
    tierLabel: string;
    factors: ReadinessFactor[];
  };
  dropRiskMap: DropRiskPoint[];
  hook: HookIntelligence;
  genreExpectation: GenreExpectationResult;
  continuityNote: string;
  trustNote: string;
}

export interface RadarPublishingIntel {
  bookTokIntensity: number | null;
  bookTokNote: string;
  commercialMomentum: CommercialMomentum;
  commercialMomentumScore: number;
  positioningMap: {
    literaryVsCommercial: number;
    emotionalVsPlot: number;
    slowBurnVsIntensity: number;
    commentary: string;
  };
  readerPersona: string;
  trustNote: string;
}

const BOOKTOK_GENRES = /romance|dark-romance|thriller|fantasy|memoir|fiction|ya/i;

function openingParagraph(content: string): string {
  return content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)[0] || content.slice(0, 600);
}

function calibrateReadiness(raw: number): number {
  const s = Math.max(0, Math.min(100, raw));
  if (s >= 88) return Math.round(78 + (s - 88) * 0.45);
  if (s >= 75) return Math.round(68 + (s - 75) * 0.77);
  if (s >= 58) return Math.round(52 + (s - 58) * 0.94);
  return Math.round(38 + (s / 58) * 14);
}

function tierFromScore(score: number): { tier: ReadinessTier; tierLabel: string } {
  if (score >= 77) return { tier: "highly-competitive", tierLabel: "Highly Competitive" };
  if (score >= 65) return { tier: "strong", tierLabel: "Strong" };
  if (score >= 52) return { tier: "developing", tierLabel: "Developing" };
  return { tier: "weak", tierLabel: "Weak" };
}

function momentumLabel(score: number): CommercialMomentum {
  if (score >= 72) return "high";
  if (score >= 58) return "strong";
  if (score >= 44) return "medium";
  return "low";
}

function genreExpectationDetail(
  genre: string,
  editorial: ReturnType<typeof analyzeNovel>,
  best: ReturnType<typeof evaluateBestsellerChapter>,
  openingBest: ReturnType<typeof evaluateBestsellerChapter>,
): GenreExpectationResult {
  const g = genre.toLowerCase();

  if (/fantasy|sci-fi/.test(g)) {
    if (openingBest.scores.hookStrength < 58) {
      return {
        aligned: false,
        severity: "medium",
        message: "Stakes or world logic may arrive too late for fantasy readers.",
        nicheNote: "Fantasy readers tolerate setup only when curiosity or threat is visible early.",
      };
    }
    if (best.scores.overall < 55) {
      return {
        aligned: false,
        severity: "medium",
        message: "Worldbuilding may be under-signaled relative to genre expectations.",
        nicheNote: "Clarify what makes this world dangerous, desirable, or irreversible.",
      };
    }
  }

  if (/romance|dark-romance/.test(g)) {
    if (best.scores.bingeability < 58) {
      return {
        aligned: false,
        severity: "high",
        message: "Attraction tension may be too weak or resolved too early for romance expectations.",
        nicheNote: "The emotional conflict arrives too late — romance readers need friction before reassurance.",
      };
    }
    if (editorial.warnings.some((w) => w.type === "emotional_redundancy")) {
      return {
        aligned: false,
        severity: "medium",
        message: "Emotional beats repeat instead of escalating — common romance retention risk.",
        nicheNote: "Delay emotional availability; let yearning do more work than explanation.",
      };
    }
  }

  if (/thriller|crime|mystery/.test(g)) {
    if (openingBest.scores.hookStrength < 62) {
      return {
        aligned: false,
        severity: "high",
        message: "Suspense escalation may be insufficient for thriller expectations.",
        nicheNote: "Open with threat, mystery, or irreversible choice — not neutral setup.",
      };
    }
    if (best.scores.readerRetention < 55) {
      return {
        aligned: false,
        severity: "medium",
        message: "Middle sections may lack sustained dread or unanswered questions.",
        nicheNote: "Thriller readers need compounding pressure, not episodic resets.",
      };
    }
  }

  if (/self-help|business|productivity|psychology/.test(g)) {
    if (editorial.warnings.some((w) => w.type === "generic_advice")) {
      return {
        aligned: false,
        severity: "high",
        message: "Transformational promise may read generic — lacks specific, actionable authority.",
        nicheNote: "Self-help readers buy a credible path, not motivational abstraction.",
      };
    }
  }

  return {
    aligned: best.scores.overall >= 58,
    severity: "low",
    message: "Genre expectations are broadly met with room for sharper commercial hooks.",
    nicheNote: "Niche signals align broadly — sharpen opening friction for your subgenre.",
  };
}

function hookIntelligence(
  fullText: string,
  genre: string,
  language?: string,
): HookIntelligence {
  const opening = openingParagraph(fullText);
  const firstChapter = fullText.split(/\n{2,}/).slice(0, 12).join("\n\n").slice(0, 4000);
  const openingEditorial = analyzeNovel(opening);
  const openingBest = evaluateBestsellerChapter({ content: opening, chapterIndex: 0, genre });
  const chapterBest = evaluateBestsellerChapter({ content: firstChapter || opening, chapterIndex: 0, genre });
  const reader = simulateReaderEmotion({
    content: opening,
    chapterIndex: 0,
    config: { genre, language: language || "English" } as any,
  });

  const openingScore = Math.round(openingBest.scores.hookStrength * 0.55 + openingEditorial.subtextScore * 0.45);
  const chapterOneScore = Math.round(chapterBest.scores.hookStrength * 0.6 + reader.curiosity * 0.4);

  const flags: string[] = [];
  if (opening.split(/\s+/).length > 120) flags.push("slow opening");
  if (openingBest.scores.hookStrength < 55) flags.push("generic setup");
  if (reader.emotionalTension < 45 && /romance|thriller|dark-romance/.test(genre)) flags.push("delayed tension");
  if (reader.curiosity < 50) flags.push("weak emotional curiosity");
  if (openingEditorial.warnings.some((w) => w.type === "generic_advice" || w.type === "repetitive_symbolism")) {
    flags.push("overwritten exposition");
  }

  let explanation = "Opening carries workable curiosity with room to sharpen conflict on page one.";
  if (/romance|dark-romance/.test(genre) && reader.emotionalTension < 50) {
    explanation = "The emotional conflict arrives too late for romance expectations — friction should appear earlier.";
  } else if (/thriller|crime|mystery/.test(genre) && openingBest.scores.hookStrength < 60) {
    explanation = "Threat or mystery could surface sooner — thriller readers decide quickly.";
  } else if (flags.includes("slow opening")) {
    explanation = "The opening paragraph takes too long to signal what kind of story this is.";
  } else if (openingScore >= 68) {
    explanation = "Strong commercial signals in the opening — curiosity and genre tone align.";
  }

  return { openingScore, chapterOneScore, explanation, flags };
}

function chapterDropRisks(
  chapters: Array<{ title: string; content: string }>,
  genre: string,
  language?: string,
): DropRiskPoint[] {
  const risks: DropRiskPoint[] = [];
  const n = chapters.length;

  chapters.forEach((chapter, index) => {
    const content = chapter.content.trim();
    if (content.split(/\s+/).length < 80) return;

    const editorial = analyzeNovel(content);
    const best = evaluateBestsellerChapter({ content, chapterIndex: index, totalChapters: n, genre });
    const reader = simulateReaderEmotion({
      content,
      chapterIndex: index,
      config: { genre, language: language || "English" } as any,
      totalChapters: n,
    });

    if (reader.compulsiveReadability < 42 && content.split(/\s+/).length > 350) {
      risks.push({
        chapter: index + 1,
        title: chapter.title,
        severity: "high",
        message: "Chapter risks reader fatigue — momentum slows mid-chapter.",
      });
    }

    if (editorial.warnings.some((w) => w.type === "emotional_redundancy")) {
      risks.push({
        chapter: index + 1,
        title: chapter.title,
        severity: "medium",
        message: "Emotional repetition may reduce immersion.",
      });
    }

    if (index > 0 && index < n - 1 && best.scores.bingeability < 52 && reader.boredomRisk >= 55) {
      risks.push({
        chapter: index + 1,
        title: chapter.title,
        severity: "medium",
        message: "Middle pacing slowdown detected — unresolved friction may be too thin.",
      });
    }

    if (index === 0 && best.scores.hookStrength < 52) {
      risks.push({
        chapter: 1,
        title: chapter.title,
        severity: "high",
        message: "Opening chapter may not earn the next chapter turn.",
      });
    }
  });

  return risks.slice(0, 10);
}

export function analyzeManuscriptPublishingIntel(input: {
  fullText: string;
  chapters: Array<{ title: string; content: string }>;
  genre: string;
  language?: string;
}): ManuscriptPublishingIntel {
  const { fullText, chapters, genre, language } = input;
  const editorial = analyzeNovel(fullText);
  const premium = computeMarketPremiumScores({ content: fullText, genre, language });

  const chapterScores = chapters.map((ch, i) =>
    evaluateBestsellerChapter({ content: ch.content, chapterIndex: i, totalChapters: chapters.length, genre }),
  );

  const avgBinge =
    chapterScores.length > 0
      ? chapterScores.reduce((s, c) => s + c.scores.bingeability, 0) / chapterScores.length
      : premium.bingeability;
  const avgRetention =
    chapterScores.length > 0
      ? chapterScores.reduce((s, c) => s + c.scores.readerRetention, 0) / chapterScores.length
      : 60;

  const dialogueRealism = Math.round(
    Math.max(35, Math.min(88, editorial.dialogueHumanityScore * 0.85 + (100 - editorial.warnings.length * 6) * 0.15)),
  );
  const subtextQuality = Math.round(editorial.subtextScore * 0.9);
  const pacingConsistency = Math.round(editorial.pacingConsistencyScore * 0.88);
  const payoffStrength =
    chapterScores.length >= 2
      ? Math.round((chapterScores.at(-1)!.scores.hookStrength + chapterScores.at(-1)!.scores.bingeability) / 2)
      : Math.round(premium.hookStrength * 0.85);
  const originality = Math.round(
    Math.max(40, 78 - editorial.warnings.filter((w) => w.type === "emotional_redundancy" || w.type === "repetitive_symbolism").length * 8),
  );

  const factors: ReadinessFactor[] = [
    { label: "Hook strength", score: premium.hookStrength, weight: 0.14 },
    { label: "Emotional momentum", score: premium.emotionalMomentum, weight: 0.12 },
    { label: "Pacing consistency", score: pacingConsistency, weight: 0.11 },
    { label: "Bingeability", score: Math.round(avgBinge), weight: 0.12 },
    { label: "Dialogue realism", score: dialogueRealism, weight: 0.1 },
    { label: "Subtext quality", score: subtextQuality, weight: 0.1 },
    { label: "Genre alignment", score: premium.genreAlignment, weight: 0.11 },
    { label: "Reader retention", score: Math.round(avgRetention), weight: 0.1 },
    { label: "Payoff strength", score: payoffStrength, weight: 0.05 },
    { label: "Originality perception", score: originality, weight: 0.05 },
  ];

  const rawWeighted = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const readinessScore = calibrateReadiness(rawWeighted);
  const { tier, tierLabel } = tierFromScore(readinessScore);

  const hook = hookIntelligence(fullText, genre, language);
  const bestFull = evaluateBestsellerChapter({ content: fullText.slice(0, 8000), chapterIndex: 0, genre });
  const openingBest = evaluateBestsellerChapter({
    content: openingParagraph(fullText),
    chapterIndex: 0,
    genre,
  });

  return {
    marketReadiness: { score: readinessScore, tier, tierLabel, factors },
    dropRiskMap: chapterDropRisks(chapters, genre, language),
    hook,
    genreExpectation: genreExpectationDetail(genre, editorial, bestFull, openingBest),
    continuityNote:
      chapters.length >= 3
        ? `Long-form analysis across ${chapters.length} chapters — progression, fatigue, and payoff timing evaluated as a continuous manuscript.`
        : "Analysis reflects available manuscript length — upload more chapters for stronger drop-risk mapping.",
    trustNote:
      "Strong commercial signals detected for this audience — not a sales guarantee. Use as developmental guidance.",
  };
}

export function analyzeRadarPublishingIntel(input: {
  genre: string;
  keyword: string;
  marketScore?: number | null;
  avgPotential?: number | null;
  authorIdentity?: AuthorIdentity | null;
}): RadarPublishingIntel {
  const text = [input.keyword, input.genre].filter(Boolean).join(" — ");
  const intel = detectBookIntelligence({ idea: text, genre: input.genre });
  const premium = computeMarketPremiumScores({ content: text, genre: input.genre });

  const bookTokIntensity = BOOKTOK_GENRES.test(input.genre)
    ? Math.round(premium.bookTokPotential ?? premium.emotionalMomentum * 0.85)
    : null;

  let bookTokNote = "BookTok scoring applies to emotionally driven fiction and memoir niches.";
  if (bookTokIntensity != null) {
    if (bookTokIntensity >= 68) {
      bookTokNote = "High emotional fixation potential — quotable tension and trope intensity align with social discovery.";
    } else if (bookTokIntensity >= 52) {
      bookTokNote = "Moderate BookTok potential — strengthen cliffhanger density and quote-worthy emotional spikes.";
    } else {
      bookTokNote = "Fantasy or romance tension may be strong but emotional hooks feel delayed for short-form discovery.";
    }
  }

  const commercialMomentumScore = Math.round(
    (premium.bingeability * 0.25 +
      premium.emotionalMomentum * 0.25 +
      (input.avgPotential != null ? input.avgPotential * 10 : 55) * 0.2 +
      (input.marketScore != null ? input.marketScore * 10 : 50) * 0.15 +
      (premium.readerRetentionRisk === "low" ? 75 : premium.readerRetentionRisk === "medium" ? 55 : 35) * 0.15),
  );

  const g = input.genre.toLowerCase();
  const literaryVsCommercial = /literary|memoir|philosophy/.test(g)
    ? 35
    : /romance|thriller|selfhelp|self-help/.test(g)
      ? 78
      : 58;
  const emotionalVsPlot = /romance|dark-romance|memoir/.test(g) ? 72 : /thriller|crime|mystery/.test(g) ? 38 : 55;
  const slowBurnVsIntensity = /romance|dark-romance/.test(g) ? 32 : /thriller|horror/.test(g) ? 82 : 50;

  const sub = intel.subcategory || intel.layers.subgenre;
  let readerPersona = `Likely resonates with readers seeking ${sub} within ${intel.layers.primaryGenre}.`;
  if (/romance|dark-romance|fantasy/.test(g)) {
    readerPersona = `Likely strongest among emotionally driven ${sub.includes("romance") ? "romantasy" : "fantasy"} readers who prefer ${slowBurnVsIntensity < 45 ? "slow-burn attachment" : "high-intensity friction"}.`;
  } else if (/thriller/.test(g)) {
    readerPersona = "Likely strongest among suspense readers who binge unresolved threat and psychological unease.";
  } else if (/selfhelp|self-help/.test(g)) {
    readerPersona = "Likely strongest among readers seeking credible transformation — not hype, but actionable clarity.";
  }

  const positioningCommentary = applyPassiveMarketCopyTone(
    literaryVsCommercial >= 65
      ? "Positioned toward commercial accessibility — prioritize hook clarity and emotional pull over literary density."
      : "Leans more literary — ensure market copy signals distinct voice without sacrificing discoverability.",
    input.authorIdentity,
  );

  return {
    bookTokIntensity,
    bookTokNote,
    commercialMomentum: momentumLabel(commercialMomentumScore),
    commercialMomentumScore,
    positioningMap: {
      literaryVsCommercial,
      emotionalVsPlot,
      slowBurnVsIntensity,
      commentary: positioningCommentary,
    },
    readerPersona: applyPassiveMarketCopyTone(readerPersona, input.authorIdentity),
    trustNote:
      "Market x-ray based on niche signals and competitive patterns — strong positioning indicators, not verified sales data.",
  };
}

export function tierTone(tier: ReadinessTier): string {
  if (tier === "highly-competitive") return "text-emerald-400";
  if (tier === "strong") return "text-sky-400";
  if (tier === "developing") return "text-amber-400";
  return "text-rose-400";
}

export function severityTone(severity: Severity): string {
  if (severity === "high") return "text-rose-500";
  if (severity === "medium") return "text-amber-600";
  return "text-muted-foreground";
}
