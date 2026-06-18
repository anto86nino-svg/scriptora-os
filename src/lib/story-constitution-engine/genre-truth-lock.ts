import type { BookConfig } from "@/types/book";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import type { ConstitutionWarning } from "./types";

const GENRE_SIGNALS: Record<string, RegExp[]> = {
  romance: [/\b(bacio|desiderio|attrazione|sguardo|cuore|kiss|desire|attraction)\b/i],
  "dark-romance": [/\b(ossessione|pericolo|desiderio|paura|controllo|obsession|danger)\b/i],
  thriller: [/\b(pericolo|inseguimento|minaccia|morte|segreto|threat|chase|risk)\b/i],
  horror: [/\b(paura|buio|silenzio|ombra|sangue|terrore|fear|dark|dread)\b/i],
  fantasy: [/\b(magia|regno|incantesimo|destino|mondo|magic|realm|spell)\b/i],
  "sci-fi": [/\b(tecnologia|futuro|sistema|planeta|ship|future|protocol)\b/i],
  memoir: [/\b(ricordo|allora|imparai|vissi|remember|learned|lived)\b/i],
  biography: [/\b(nacque|visse|morì|carriera|born|lived|career)\b/i],
  "self-help": [/\b(puoi|metodo|esercizio|passo|transform|practice|step)\b/i],
  business: [/\b(strategia|mercato|decisione|risultato|strategy|market|roi)\b/i],
  poetry: [/\b(verso|ritmo|metafora|silenzio|verse|rhythm|image)\b/i],
};

export function evaluateGenreTruthLock(
  text: string,
  config: BookConfig,
): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  const genre = String(config.genre || "").toLowerCase();
  const family = resolveBookTypeDefinition(
    config.genre,
    config.subcategory,
    config.subgenre,
    config.bookTypeId,
  ).family;

  if (family === "nonfiction" || family === "educational" || family === "manual") {
    const hasActionable = /\b(fai|prova|esercizio|step|apply|try|practice|how to)\b/i.test(text);
    if (!hasActionable && text.split(/\s+/).length > 180) {
      warnings.push({
        ruleId: "genre_truth_lock",
        severity: "warning",
        message: "Testo non-fiction senza applicazione pratica sufficiente.",
        suggestion: "Aggiungi passi concreti, esempi o esercizi.",
      });
    }
    return warnings;
  }

  const patterns =
    GENRE_SIGNALS[genre] ||
    GENRE_SIGNALS[genre.replace(/\s+/g, "-")] ||
    [/\b(ma|però|quindi|then|but)\b/i];

  const hits = patterns.filter((p) => p.test(text)).length;
  if (hits === 0 && text.split(/\s+/).length > 120) {
    warnings.push({
      ruleId: "genre_truth_lock",
      severity: "warning",
      message: `Segnali di genere (${genre}) deboli nel capitolo.`,
      suggestion: "Rafforza le convenzioni del genere senza forzare cliché.",
    });
  }

  return warnings;
}

export function buildGenreTruthLockBlock(config: BookConfig): string {
  const genre = config.genre;
  const hints: Record<string, string> = {
    romance: "Attrazione, tensione romantica, relazione in evoluzione.",
    "dark-romance": "Desiderio pericoloso, controllo, vulnerabilità, conseguenze.",
    thriller: "Rischio crescente, escalation, suspense, deadline.",
    horror: "Inquietudine, perdita di controllo, vulnerabilità corporea.",
    fantasy: "Meraviglia, regole del mondo, conseguenze del sistema.",
    "sci-fi": "Sistema, conseguenze tecnologiche, mondo coerente.",
    "self-help": "Trasformazione, chiarezza, applicazione pratica.",
    business: "Decisioni, strategia, risultati misurabili.",
    memoir: "Memoria viva, evoluzione interiore, verità personale.",
    poetry: "Immagini, ritmo, intensità emotiva compressa.",
  };
  const line = hints[genre] || hints[String(genre).replace(/\s+/g, "-")] || "Rispetta le aspettative del genere senza cliché gratuiti.";
  return `GENRE TRUTH LOCK (${genre}): ${line}`;
}
