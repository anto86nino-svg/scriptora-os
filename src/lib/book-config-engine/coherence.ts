import type { BookConfig } from "@/types/book";
import type { CoherenceReport } from "./types";
import { inferLevel1FromConfig, getLevel1Definition, isBookTypeAllowedForLevel1, subcategoryMatchesBlockedToken } from "./level1-lock";
import { resolveGenreDnaProfile } from "./genre-dna";
import { sanitizeBookConfiguration } from "./sanitize";
import type { ConfigFix } from "./types";

function scoreFromIssues(issues: string[], base = 100): number {
  return Math.max(0, base - issues.length * 18);
}

export function validateConfigCoherence(config: BookConfig): CoherenceReport {
  const { config: sanitized, fixes: autoFixes } = sanitizeBookConfiguration(config);
  const level1 = inferLevel1FromConfig(sanitized);
  const levelDef = getLevel1Definition(level1);
  const dna = resolveGenreDnaProfile(sanitized);

  const genreIssues: string[] = [];
  const voiceIssues: string[] = [];
  const commercialIssues: string[] = [];
  const toneIssues: string[] = [];
  const marketIssues: string[] = [];

  if (config.bookTypeId && !isBookTypeAllowedForLevel1(config.bookTypeId, level1)) {
    genreIssues.push(`Tipo libro (${config.bookTypeId}) non ammesso per ${levelDef.label}`);
  }
  if (subcategoryMatchesBlockedToken(config.subcategory, levelDef.blockedSubcategoryTokens)) {
    genreIssues.push(`Sottocategoria "${config.subcategory}" incompatibile con ${levelDef.label}`);
  }

  const toneHay = config.tone.toLowerCase();
  if (dna.blockedTonePatterns.some((p) => p.test(toneHay))) {
    toneIssues.push(`Tono contiene segnali di un genere precedente`);
  }
  if (dna.blockedAuthorStylePatterns.some((p) => p.test(config.authorStyle))) {
    voiceIssues.push(`Stile autore non coerente con ${dna.label}`);
  }
  if ((config.styleProfile?.poeticLevel ?? 0) > 60 && dna.traits.poeticDensity === "LOW") {
    voiceIssues.push("Livello poetico troppo alto per il genere");
  }
  if ((config.styleProfile?.emotionalIntensity ?? 0) > 85 && dna.traits.therapeuticSpeech === "BLOCKED") {
    voiceIssues.push("Intensità emotiva da self-help su narrativa");
  }

  if (!String(config.targetReader || "").trim()) {
    commercialIssues.push("Target lettore non definito");
  }
  if (!String(config.title || "").trim() || config.title === "Romanzo senza titolo") {
    commercialIssues.push("Titolo commerciale mancante");
  }

  const marketHay = `${config.targetReader || ""} ${config.idea || ""}`.toLowerCase();
  if (level1 === "romanzo" && /mindset|coaching|healing/i.test(marketHay)) {
    marketIssues.push("Obiettivo di mercato da nonfiction su narrativa");
  }

  const dimensions = [
    { id: "genre", label: "Genre coherence", score: scoreFromIssues(genreIssues), issues: genreIssues },
    { id: "voice", label: "Voice coherence", score: scoreFromIssues(voiceIssues), issues: voiceIssues },
    { id: "commercial", label: "Commercial fit", score: scoreFromIssues(commercialIssues, 90), issues: commercialIssues },
    { id: "tone", label: "Tone consistency", score: scoreFromIssues(toneIssues), issues: toneIssues },
    { id: "market", label: "Market alignment", score: scoreFromIssues(marketIssues, 95), issues: marketIssues },
  ];

  const overall = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const needsCorrection = overall < 72 || autoFixes.length > 0;

  return {
    overall,
    dimensions,
    needsCorrection,
    suggestedFixes: autoFixes as ConfigFix[],
  };
}
