/**
 * market-intelligence-premium.ts
 * Computes premium market readiness scores from book content, genre, and language.
 * All fields always returned — never undefined — safe to read without optional chaining.
 */

export interface MarketPremiumScores {
  /** Composite score 0-100 */
  composite: number;
  /** How well the hook/title stops a scrolling buyer (0-100) */
  hookStrength: number;
  /** Reader binge-read likelihood (0-100) */
  bingeability: number;
  /** Emotional momentum through the narrative (0-100) */
  emotionalMomentum: number;
  /** Alignment with the declared genre conventions (0-100) */
  genreAlignment: number;
  /** BookTok / social virality potential (0-100, optional) */
  bookTokPotential: number | null;
  /** Risk of reader drop-off: "low" | "medium" | "high" */
  readerRetentionRisk: "low" | "medium" | "high";
  /** Estimated drop-risk score (0-100, higher = more risk) */
  readerDropRiskEstimate: number;
  /** Human-readable note about genre alignment */
  genreAlignmentNote: string;
}

interface ComputeInput {
  content: string;
  genre: string;
  language?: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function detectTone(content: string): { emotional: boolean; actionPacked: boolean; reflective: boolean } {
  const lower = content.toLowerCase();
  const emotional = /amore|cuore|pianto|sorriso|paura|speranza|love|heart|cry|smile|fear|hope/.test(lower);
  const actionPacked = /combatt|esplos|corr|attacc|fug|fight|run|attack|chase|explod/.test(lower);
  const reflective = /pens|rifletti|medita|wonder|thought|reflect|contempl/.test(lower);
  return { emotional, actionPacked, reflective };
}

function genreAlignmentScore(genre: string, tone: ReturnType<typeof detectTone>): number {
  const g = genre.toLowerCase();
  if ((g.includes("romance") || g.includes("romantique") || g.includes("romanzo")) && tone.emotional) return 88;
  if ((g.includes("thriller") || g.includes("mystery") || g.includes("suspense")) && tone.actionPacked) return 85;
  if ((g.includes("self-help") || g.includes("personal") || g.includes("crescita")) && tone.reflective) return 82;
  if (tone.emotional || tone.actionPacked || tone.reflective) return 72;
  return 60;
}

function genreNote(genre: string, score: number, italian: boolean): string {
  if (score >= 82) {
    return italian
      ? `Il contenuto è ben allineato con le aspettative del genere ${genre}.`
      : `Content is well aligned with ${genre} genre expectations.`;
  }
  if (score >= 65) {
    return italian
      ? `Allineamento parziale con il genere ${genre}. Considera di rafforzare i tropi chiave.`
      : `Partial alignment with ${genre}. Consider reinforcing key genre tropes.`;
  }
  return italian
    ? `Il contenuto potrebbe non soddisfare le aspettative dei lettori di ${genre}.`
    : `Content may not meet ${genre} reader expectations.`;
}

function bookTokScore(genre: string, content: string): number | null {
  const g = genre.toLowerCase();
  const lower = content.toLowerCase();
  const socialGenres = ["romance", "romantique", "fantasy", "ya", "young adult", "thriller", "dark romance"];
  const isSocial = socialGenres.some((sg) => g.includes(sg));
  if (!isSocial) return null;
  const hasHook = /[!?]{1,}|\.{3}/.test(content);
  return clamp(55 + (hasHook ? 15 : 0) + (lower.includes("segreto") || lower.includes("secret") ? 10 : 0));
}

export function computeMarketPremiumScores({ content, genre, language }: ComputeInput): MarketPremiumScores {
  try {
    const safeContent = content ?? "";
    const safeGenre = genre ?? "General";
    const italian = (language ?? "").toLowerCase().includes("ital") || (language ?? "").toLowerCase() === "it";

    const words = wordCount(safeContent);
    const tone = detectTone(safeContent);

    // Hook strength: short punchy content with emotional/action beats scores higher
    const hookStrength = clamp(
      50 +
        (words >= 10 ? 10 : 0) +
        (tone.emotional ? 12 : 0) +
        (tone.actionPacked ? 14 : 0) +
        (safeContent.includes("?") ? 6 : 0) +
        (safeContent.includes("!") ? 4 : 0)
    );

    // Bingeability: emotional + action content drives binge reads
    const bingeability = clamp(
      48 +
        (tone.emotional ? 15 : 0) +
        (tone.actionPacked ? 18 : 0) +
        (words >= 20 ? 8 : 0)
    );

    // Emotional momentum
    const emotionalMomentum = clamp(
      50 + (tone.emotional ? 20 : 0) + (tone.reflective ? 10 : 0) + (words >= 15 ? 5 : 0)
    );

    // Genre alignment
    const genreAlign = genreAlignmentScore(safeGenre, tone);

    // Reader drop-risk estimate (0-100, higher = more risky)
    const readerDropRiskEstimate = clamp(
      100 - bingeability - (tone.emotional ? 8 : 0) - (tone.actionPacked ? 8 : 0)
    );

    // Reader retention risk label
    const readerRetentionRisk: "low" | "medium" | "high" =
      readerDropRiskEstimate <= 30 ? "low" : readerDropRiskEstimate <= 55 ? "medium" : "high";

    // BookTok potential
    const bookTokPotential = bookTokScore(safeGenre, safeContent);

    // Composite
    const composite = clamp(
      hookStrength * 0.25 +
        bingeability * 0.25 +
        emotionalMomentum * 0.2 +
        genreAlign * 0.2 +
        (100 - readerDropRiskEstimate) * 0.1
    );

    return {
      composite,
      hookStrength,
      bingeability,
      emotionalMomentum,
      genreAlignment: genreAlign,
      bookTokPotential,
      readerRetentionRisk,
      readerDropRiskEstimate,
      genreAlignmentNote: genreNote(safeGenre, genreAlign, italian),
    };
  } catch {
    // Ultimate fallback — never crash the caller
    return {
      composite: 50,
      hookStrength: 50,
      bingeability: 50,
      emotionalMomentum: 50,
      genreAlignment: 50,
      bookTokPotential: null,
      readerRetentionRisk: "medium",
      readerDropRiskEstimate: 50,
      genreAlignmentNote: "",
    };
  }
}
