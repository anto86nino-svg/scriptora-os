import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";

export interface PremiumEditorialScores {
  commercialReadability: number;
  readerDropRisk: number;
  hookStrength: number;
  bingeability: number;
  bookTokIntensity: number | null;
  scenePacing: number;
  emotionalRealism: number;
  dialogueHumanity: number;
  characterConsistency: number;
  composite: number;
  surgicalSuggestions: string[];
}

function dialogueHumanityScore(content: string): number {
  const lines = content.match(/[«""][^«""\n]{8,}[»""]/g) || [];
  if (!lines.length) return 62;
  let human = 0;
  for (const line of lines) {
    if (/\.{2,}|—|…|\?.*\?|non so|forse|ma\b|eh\b/i.test(line)) human++;
    if (/ti amo|I love you|mi dispiace profondamente|capisco perfettamente/i.test(line)) human -= 0.5;
  }
  return Math.round(Math.max(35, Math.min(92, 58 + (human / lines.length) * 28)));
}

function emotionalRealismScore(content: string, readerTension: number): number {
  const therapy = (content.match(/\b(capisco|understand|it's okay|va tutto bene|non è colpa tua)\b/gi) || []).length;
  const resistance = (content.match(/\b(no|non|ma|wait|aspetta|ferm)\b/gi) || []).length;
  const base = 52 + readerTension * 0.25;
  return Math.round(Math.max(30, Math.min(94, base - therapy * 2 + Math.min(resistance, 12) * 0.8)));
}

function buildSurgicalSuggestions(
  editorial: ReturnType<typeof analyzeNovel>,
  best: ReturnType<typeof evaluateBestsellerChapter>,
  dialogue: number,
  emotional: number,
): string[] {
  const out: string[] = [];
  if (best.scores.hookStrength < 65) {
    out.push("Apri con un'immagine concreta o un'azione — non con stato d'animo generico.");
  }
  if (editorial.pacingConsistencyScore < 60) {
    out.push("Accorcia un paragrafo espositivo e chiudi la scena con una conseguenza visibile.");
  }
  if (dialogue < 58) {
    out.push("Inserisci un'interruzione o una risposta evasiva nel dialogo più terapeutico.");
  }
  if (emotional < 55) {
    out.push("Riduci dichiarazioni emotive esplicite — mostra resistenza o imbarazzo.");
  }
  if (best.scores.bingeability < 62) {
    out.push("Termina con una domanda irrisolta o un rischio che spinge al capitolo successivo.");
  }
  if (editorial.warnings.length > 2) {
    out.push(`Risolvi: ${editorial.warnings[0]?.message || "pattern generico"} in modo chirurgico, non con rewrite totale.`);
  }
  return out.slice(0, 5);
}

export function computePremiumEditorialScores(input: {
  content: string;
  genre?: string;
  language?: string;
  chapterIndex?: number;
}): PremiumEditorialScores {
  const content = String(input.content || "").trim();
  const genre = input.genre || "fiction";
  const editorial = analyzeNovel(content);
  const best = evaluateBestsellerChapter({ content, chapterIndex: input.chapterIndex ?? 0, genre });
  const reader = simulateReaderEmotion({
    content,
    chapterIndex: input.chapterIndex ?? 0,
    config: { genre, language: input.language || "Italian" } as any,
  });

  const dialogueHumanity = dialogueHumanityScore(content);
  const emotionalRealism = emotionalRealismScore(content, reader.emotionalTension);
  const readerDropRisk = Math.round(Math.max(8, Math.min(92, 100 - best.scores.readerRetention)));
  const scenePacing = Math.round((editorial.pacingConsistencyScore + best.scores.commercialPacing) / 2);
  const characterConsistency = Math.round(Math.max(40, 88 - editorial.warnings.length * 6));
  const bookTokIntensity = /romance|dark-romance|thriller|fantasy/i.test(genre)
    ? Math.round(best.scores.bookTokIntensity)
    : null;

  const composite = Math.round(
    best.scores.hookStrength * 0.12 +
      best.scores.bingeability * 0.12 +
      editorial.subtextScore * 0.1 +
      dialogueHumanity * 0.12 +
      emotionalRealism * 0.12 +
      scenePacing * 0.1 +
      (100 - readerDropRisk) * 0.14 +
      characterConsistency * 0.18,
  );

  return {
    commercialReadability: Math.round((editorial.subtextScore + best.scores.overall) / 2),
    readerDropRisk,
    hookStrength: Math.round(best.scores.hookStrength),
    bingeability: Math.round(best.scores.bingeability),
    bookTokIntensity,
    scenePacing,
    emotionalRealism,
    dialogueHumanity,
    characterConsistency,
    composite,
    surgicalSuggestions: buildSurgicalSuggestions(editorial, best, dialogueHumanity, emotionalRealism),
  };
}
