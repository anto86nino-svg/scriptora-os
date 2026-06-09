import type { BookBlueprint, BookConfig, BookProject, Chapter } from "@/types/book";
import { resolveChapterTitle, isGenericChapterTitle } from "@/lib/chapter-titles";
import { deriveContentFirstChapterTitle } from "@/lib/chapter-title-engine-v2";
import { isDevMode } from "@/lib/dev-mode";

const TECHNICAL_LEAK_RE =
  /\b(to be generated|chapter setup|genre coach|assistant|debug|placeholder|lorem ipsum|todo:?|tbd|n\/a)\b/i;

const FORBIDDEN_TITLE_RE =
  /^(?:to|the|a|an|untitled|senza titolo|chapter|capitolo|chapitre|kapitel|capitulo|titolo|title|section|sezione|part|parte|intro|introduction|preface|prefazione)$/i;

const FORBIDDEN_TITLE_FRAGMENT_RE =
  /^to\s+be\s+generated$/i;

export type ChapterPreflightResult =
  | { ok: true; title: string; summary: string; language: string }
  | { ok: false; code: string; message: string; userMessage: string };

export type ChapterGenerationErrorCode =
  | "timeout"
  | "auth"
  | "credits"
  | "prompt_invalid"
  | "blueprint_missing"
  | "empty_response"
  | "multiple_attempts"
  | "network"
  | "unknown";

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/^#+\s*/, "")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isItalian(language?: string): boolean {
  const l = String(language || "").toLowerCase();
  return !l || l.startsWith("it") || l === "italian" || l === "italiano";
}

function historyFallbackTitles(index: number, italian: boolean): string[] {
  if (italian) {
    return [
      "Le origini del conflitto",
      "Il mondo prima della guerra",
      "Perché scoppiò la Grande Guerra",
      "Le potenze in campo",
      "La scintilla che accese l'Europa",
      "La mobilitazione generale",
      "Le prime battaglie",
      "La guerra su tutti i fronti",
      "La vita dei soldati",
      "Le conseguenze durature",
    ];
  }
  return [
    "The origins of the conflict",
    "The world before the war",
    "Why the Great War began",
    "The powers at stake",
    "The spark that lit Europe",
    "General mobilization",
    "The first battles",
    "War on every front",
    "Life in the trenches",
    "Lasting consequences",
  ];
}

function isHistoryContext(config?: Partial<BookConfig>): boolean {
  const blob = `${config?.title || ""} ${config?.subtitle || ""} ${config?.genre || ""} ${config?.category || ""} ${config?.subcategory || ""}`.toLowerCase();
  return /histor|stori|guerra|war|grande guerra|world war|educat|non.?fiction|saggio|essay/.test(blob);
}

export function isForbiddenChapterTitle(value: unknown): boolean {
  const cleaned = cleanText(value);
  if (!cleaned) return true;
  if (cleaned.length <= 3) return true;
  if (FORBIDDEN_TITLE_RE.test(cleaned)) return true;
  if (FORBIDDEN_TITLE_FRAGMENT_RE.test(cleaned)) return true;
  if (isGenericChapterTitle(cleaned)) return true;
  if (TECHNICAL_LEAK_RE.test(cleaned)) return true;
  return false;
}

export function isForbiddenChapterSummary(value: unknown): boolean {
  const cleaned = cleanText(value);
  if (!cleaned) return true;
  const loose = cleaned.toLowerCase();
  if (loose === "to be generated" || loose === "da generare") return true;
  if (/^develop chapter \d+/i.test(cleaned)) return true;
  if (/^sviluppa il capitolo/i.test(cleaned)) return true;
  if (TECHNICAL_LEAK_RE.test(cleaned)) return true;
  return false;
}

export function sanitizeChapterSummary(
  input: unknown,
  chapterIndex: number,
  config: BookConfig,
  blueprint?: BookBlueprint | null,
): string {
  const raw = cleanText(input);
  if (!isForbiddenChapterSummary(raw)) return raw;

  const italian = isItalian(config.language);
  const outline = blueprint?.chapterOutlines?.[chapterIndex];
  const overview = cleanText(blueprint?.overview);
  if (overview && !TECHNICAL_LEAK_RE.test(overview)) {
    const sentence = overview.split(/[.!?]+/).map((s) => s.trim()).find((s) => s.length > 24);
    if (sentence) return `${sentence}.`;
  }

  const title = deriveContentFirstChapterTitle(chapterIndex, {
    config,
    summary: raw,
    blueprint: blueprint || undefined,
    totalChapters: config.numberOfChapters,
  });
  if (isHistoryContext(config)) {
    return italian
      ? `Questo capitolo introduce "${title}": contesto storico, cause profonde e prime conseguenze legate a "${config.title}".`
      : `This chapter introduces "${title}": historical context, root causes, and early consequences related to "${config.title}".`;
  }

  return italian
    ? `Questo capitolo sviluppa "${title}" e collega il tema centrale di "${config.title}" al percorso del lettore.`
    : `This chapter develops "${title}" and connects the core theme of "${config.title}" to the reader's journey.`;
}

export function sanitizeChapterTitle(
  input: unknown,
  chapterIndex: number,
  config: BookConfig,
  blueprint?: BookBlueprint | null,
  previousTitles: string[] = [],
): string {
  const outline = blueprint?.chapterOutlines?.[chapterIndex];
  const summary = sanitizeChapterSummary(outline?.summary, chapterIndex, config, blueprint);
  const resolved = resolveChapterTitle(input || outline?.title, chapterIndex, {
    config,
    summary,
    totalChapters: config.numberOfChapters,
    blueprint: blueprint || undefined,
    previousTitles,
  });

  if (!isForbiddenChapterTitle(resolved)) return resolved;

  const italian = isItalian(config.language);
  if (isHistoryContext(config)) {
    const pool = historyFallbackTitles(chapterIndex, italian);
    return pool[chapterIndex % pool.length];
  }

  const theme = blueprint?.themes?.[chapterIndex % Math.max(1, blueprint?.themes?.length || 1)];
  if (theme && cleanText(theme).length > 6 && !isForbiddenChapterTitle(theme)) {
    return cleanText(theme).slice(0, 72);
  }

  const bookWords = cleanText(config.title).split(/\s+/).filter((w) => w.length > 3);
  if (bookWords.length >= 2) {
    const anchor = bookWords.slice(0, 3).join(" ");
    return italian
      ? `${anchor}: capitolo ${chapterIndex + 1}`
      : `${anchor}: chapter ${chapterIndex + 1}`;
  }

  return italian ? `Capitolo ${chapterIndex + 1}` : `Chapter ${chapterIndex + 1}`;
}

export function buildEditorialChapterPreview(
  chapterIndex: number,
  config: BookConfig,
  blueprint?: BookBlueprint | null,
): string {
  const italian = isItalian(config.language);
  const title = sanitizeChapterTitle(
    blueprint?.chapterOutlines?.[chapterIndex]?.title,
    chapterIndex,
    config,
    blueprint,
  );
  const summary = sanitizeChapterSummary(
    blueprint?.chapterOutlines?.[chapterIndex]?.summary,
    chapterIndex,
    config,
    blueprint,
  );

  const summaryLine = compactPreviewSentence(summary, italian, 220);
  if (italian) {
    return `Scriptora sta preparando il capitolo ${chapterIndex + 1} («${title}»): ${summaryLine}`;
  }
  return `Scriptora is preparing chapter ${chapterIndex + 1} ("${title}"): ${summaryLine}`;
}

function compactPreviewSentence(text: string, italian: boolean, max: number): string {
  let clean = cleanText(text)
    .replace(TECHNICAL_LEAK_RE, "")
    .replace(/\b(To be generated|Da generare)\b/gi, "")
    .trim();
  if (!clean || clean.length < 20) {
    clean = italian
      ? "introduce il contesto, chiarisce le cause profonde e guida il lettore verso il primo nodo narrativo o educativo."
      : "introduces context, clarifies root causes, and guides the reader toward the first narrative or educational beat.";
  }
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "").trim()}…`;
}

export function preflightChapterGeneration(
  project: BookProject | null | undefined,
  chapterIndex: number,
): ChapterPreflightResult {
  if (!project) {
    return {
      ok: false,
      code: "project_missing",
      message: "Project is null",
      userMessage: "Progetto non trovato. Riapri il libro e riprova.",
    };
  }
  if (!project.blueprint?.chapterOutlines?.length) {
    return {
      ok: false,
      code: "blueprint_missing",
      message: "Blueprint missing",
      userMessage: "Manca il blueprint del libro. Apri Struttura e genera l'indice prima di generare il capitolo.",
    };
  }

  const config = project.config;
  const blueprint = project.blueprint;
  const previousTitles = (project.chapters || [])
    .slice(0, chapterIndex)
    .map((ch, i) => sanitizeChapterTitle(ch.title, i, config, blueprint));

  const title = sanitizeChapterTitle(
    blueprint.chapterOutlines[chapterIndex]?.title ?? project.chapters?.[chapterIndex]?.title,
    chapterIndex,
    config,
    blueprint,
    previousTitles,
  );
  const summary = sanitizeChapterSummary(
    blueprint.chapterOutlines[chapterIndex]?.summary,
    chapterIndex,
    config,
    blueprint,
  );
  const language = cleanText(config.language) || "Italian";

  if (isForbiddenChapterTitle(title)) {
    return {
      ok: false,
      code: "title_invalid",
      message: `Invalid title: ${title}`,
      userMessage: "Il capitolo non ha ancora una struttura valida. Ho rigenerato titolo e direzione: riprova ora.",
    };
  }

  const promptProbe = `${title}. ${summary}`;
  if (TECHNICAL_LEAK_RE.test(promptProbe) || promptProbe.length < 24) {
    return {
      ok: false,
      code: "prompt_invalid",
      message: "Prompt contains placeholders",
      userMessage: "Struttura capitolo incompleta. Rigenera indice o blueprint, poi riprova.",
    };
  }

  const target = project.chapters?.[chapterIndex]?.lengthOverride;
  if (target && /^(xs|xxs|huge|enorme)$/i.test(target)) {
    return {
      ok: false,
      code: "length_invalid",
      message: `Chapter length override too large: ${target}`,
      userMessage: "Lunghezza capitolo troppo elevata per il provider. Prova una lunghezza breve o media.",
    };
  }

  return { ok: true, title, summary, language };
}

const OUTPUT_LEAK_PATTERNS: RegExp[] = [
  /\bTo be generated\b/gi,
  /\bChapter setup in progress\b/gi,
  /\bGenre Coach\b/gi,
  /\bAssistant\b/gi,
  /^#{1,6}\s+/gm,
];

export function sanitizeChapterOutput(content: string, config: BookConfig, chapterTitle?: string): string {
  let text = String(content || "").replace(/\r/g, "").trim();
  for (const pattern of OUTPUT_LEAK_PATTERNS) {
    text = text.replace(pattern, "");
  }

  const title = cleanText(chapterTitle);
  if (title && title.length > 3) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`^${escaped}[.!?:\\s]*`, "i"), "").trim();
    text = text.replace(new RegExp(`^#+\\s*${escaped}\\s*$`, "gim"), "").trim();
  }

  if (isItalian(config.language)) {
    text = text
      .replace(/\b(To be generated|Chapter setup|Assistant says)\b/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return text.trim();
}

export function isChapterOutputTooShort(content: string, minWords = 40): boolean {
  const words = content.split(/\s+/).filter(Boolean).length;
  return words < minWords;
}

export function classifyChapterGenerationError(err: unknown): {
  code: ChapterGenerationErrorCode;
  userMessage: string;
  devCode: string;
} {
  const msg = err instanceof Error ? err.message : String(err ?? "unknown");

  if (/Generation failed after multiple attempts/i.test(msg)) {
    return {
      code: "multiple_attempts",
      userMessage: "Il motore AI non ha completato il capitolo dopo vari tentativi. Riprova con lunghezza breve o attendi qualche secondo.",
      devCode: "CH-GEN-MULTI-RETRY",
    };
  }
  if (/401|unauthorized|jwt|not.*authenticated/i.test(msg)) {
    return { code: "auth", userMessage: "Sessione scaduta. Effettua di nuovo l'accesso.", devCode: "CH-AUTH-401" };
  }
  if (/credit|quota|402|exhausted|insufficient/i.test(msg)) {
    return { code: "credits", userMessage: "Crediti insufficienti per generare questo capitolo.", devCode: "CH-CREDITS" };
  }
  if (/timeout|timed out|aborted|AbortError|no response/i.test(msg)) {
    return {
      code: "timeout",
      userMessage: "Il motore AI non ha risposto in tempo. Riprova tra qualche secondo o scegli lunghezza breve.",
      devCode: "CH-TIMEOUT",
    };
  }
  if (/missing.*supabase|VITE_SUPABASE|configurazione/i.test(msg)) {
    return {
      code: "network",
      userMessage: "Configurazione AI mancante o non raggiungibile.",
      devCode: "CH-CONFIG",
    };
  }
  if (/empty output|no content|vuota|empty response/i.test(msg)) {
    return {
      code: "empty_response",
      userMessage: "Il motore ha restituito una risposta vuota. Nessun testo è stato salvato.",
      devCode: "CH-EMPTY",
    };
  }
  if (/blueprint|prompt.*invalid|struttura/i.test(msg)) {
    return {
      code: "prompt_invalid",
      userMessage: "Struttura capitolo incompleta. Rigenera indice o blueprint.",
      devCode: "CH-PROMPT",
    };
  }
  if (/fetch|network|CORS|failed to fetch/i.test(msg)) {
    return {
      code: "network",
      userMessage: "Connessione al motore AI non disponibile. Controlla la rete e riprova.",
      devCode: "CH-NET",
    };
  }

  return {
    code: "unknown",
    userMessage: `Generazione non riuscita. Codice: CH-UNK. Riprova o riduci la lunghezza del capitolo.`,
    devCode: "CH-UNK",
  };
}

export function logChapterGenerationDev(context: Record<string, unknown>): void {
  if (!isDevMode()) return;
  console.info("[Scriptora][chapter-gen]", context);
}
