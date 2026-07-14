import type { BookConfig, BookProject } from "@/types/book";
import { computePremiumEditorialScores } from "@/lib/editorial-intelligence-premium";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import { runNarrativeIntelligenceDirector } from "@/lib/writing-engine-v13/narrative-intelligence-director";
import { getGenreProfile } from "@/lib/genre-intelligence";
import type { AdvisorySignal, MarketSlice } from "../types";

export function buildEditorialSignals(
  text: string,
  config: Pick<BookConfig, "genre" | "language" | "tone">,
): AdvisorySignal[] {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  const premium = computePremiumEditorialScores({
    content: trimmed,
    genre: config.genre,
    language: config.language,
  });

  const signals: AdvisorySignal[] = premium.surgicalSuggestions.slice(0, 4).map((message) => ({
    module: "editorial",
    severity: "note",
    message,
  }));

  if (premium.dialogueHumanity < 60) {
    signals.push({
      module: "editorial",
      severity: "warn",
      message: "Dialoghi con poca umanità — inserire attrito e interruzioni.",
    });
  }
  if (premium.characterConsistency < 58) {
    signals.push({
      module: "character",
      severity: "warn",
      message: "Coerenza personaggi da rafforzare nelle reazioni di scena.",
    });
  }

  return signals.slice(0, 6);
}

export function buildNarrativeSignals(
  text: string,
  config: Pick<BookConfig, "genre" | "language">,
): AdvisorySignal[] {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  const family = /self-help|business|manual|saggio|nonfiction/i.test(String(config.genre))
    ? "nonfiction"
    : "narrative";
  const director = runNarrativeIntelligenceDirector(trimmed, { family, genre: config.genre });

  return director.signals.slice(0, 4).map((signal) => ({
    module: "narrative",
    severity: signal.score < 55 ? "warn" : "note",
    message: signal.message,
  }));
}

export function buildMarketSignals(
  pitch: string,
  genre: string,
  language?: string,
): { signals: AdvisorySignal[]; market: MarketSlice } {
  const trimmed = String(pitch || "").trim();
  if (trimmed.length < 20) {
    return { signals: [], market: { commercialNotes: [] } };
  }

  const market = computeMarketPremiumScores({
    content: trimmed,
    genre,
    language,
  });

  const signals: AdvisorySignal[] = [];
  if (market.bookTokPotential != null && market.bookTokPotential >= 62) {
    signals.push({
      module: "commercial",
      severity: "info",
      message: "Forte potenziale BookTok nel concept analizzato.",
    });
  }
  if (market.genreAlignmentNote) {
    signals.push({
      module: "market",
      severity: "note",
      message: market.genreAlignmentNote,
    });
  }
  if (market.readerRetentionRisk === "high") {
    signals.push({
      module: "market",
      severity: "warn",
      message: "Rischio di abbandono lettore elevato nel passaggio analizzato.",
    });
  }

  try {
    const profile = getGenreProfile(genre);
    if (profile.donts[0]) {
      signals.push({
        module: "genre",
        severity: "note",
        message: `Attenzione genere: evita ${profile.donts[0].toLowerCase()}.`,
      });
    }
  } catch {
    // optional genre profile
  }

  return {
    signals: signals.slice(0, 4),
    market: {
      commercialNotes: signals.map((signal) => signal.message),
      bookTokPotential: market.bookTokPotential,
      genreAlignmentNote: market.genreAlignmentNote,
    },
  };
}

export function buildProjectPitch(project: BookProject): string {
  return [
    project.config.title,
    project.config.subtitle,
    project.config.idea,
    project.config.forgeStoryArchitecture,
    project.blueprint?.overview,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}
