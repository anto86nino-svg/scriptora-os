/**
 * Intelligent Chapter Title Engine V2
 * Content-first titles derived from book context — no reusable narrative templates.
 */
import type { BookBlueprint, BookConfig } from "@/types/book";

export type ChapterTitleEngineContext = {
  config?: Partial<BookConfig>;
  summary?: string;
  totalChapters?: number;
  language?: string;
  blueprint?: Pick<BookBlueprint, "overview" | "themes" | "emotionalArc" | "chapterOutlines">;
  previousTitles?: string[];
};

const EN_TEMPLATE_TITLES = new Set([
  "the spark", "the first crack", "the hidden want", "the hidden desire", "the threshold",
  "the difficult choice", "the breaking point", "the suspended promise", "the necessary distance",
  "the secret at the surface", "the night of truth", "the price of silence", "the map of conflict",
  "the speaking wound", "the step beyond", "the tension that remains", "the decisive test",
  "the returning shadow", "the unexpected answer", "the heart of the story", "the line to cross",
  "the consequence", "the final knot", "the reckoning", "the last threshold", "the kept promise",
  "the new beginning", "the shape of change", "the final choice", "after the storm", "the open door",
  "the trigger", "the turning point", "the hidden truth", "the first step", "the final chapter",
]);

const IT_TEMPLATE_TITLES = new Set([
  "l'innesco", "la prima crepa", "il desiderio nascosto", "la soglia", "la scelta difficile",
  "il punto di rottura", "la promessa sospesa", "la distanza necessaria", "il segreto in superficie",
  "la notte della verita", "il prezzo del silenzio", "la mappa del conflitto", "la ferita che parla",
  "il passo oltre", "la tensione che resta", "la prova decisiva", "il ritorno dell'ombra",
  "la risposta inattesa", "il cuore della storia", "la linea da attraversare", "la conseguenza",
  "il nodo finale", "la resa dei conti", "l'ultima soglia", "la promessa mantenuta",
  "il nuovo inizio", "la forma del cambiamento", "la scelta definitiva", "dopo la tempesta", "la porta aperta",
]);

const ABSTRACT_EN_RE =
  /^the\s+(trigger|threshold|turning point|breaking point|hidden|secret|first crack|difficult choice|final choice|last|new beginning|spark|reckoning|consequence|journey|moment|truth|revelation|awakening|crossroads)\b/i;
const ABSTRACT_IT_RE =
  /^(l'|il |la |lo )?(innesco|soglia|scelta|punto di rottura|verita|segreto|crepa|trigger|momento|svolta|conseguenza|inizio|fine)\b/i;

function cleanTitle(value: unknown): string {
  return String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLoose(value: string): string {
  return cleanTitle(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function languageIsEnglish(language?: string): boolean {
  return String(language || "").toLowerCase().startsWith("eng");
}

export function isTemplateChapterTitle(value: unknown, language?: string): boolean {
  const cleaned = cleanTitle(value);
  if (!cleaned) return true;
  const loose = normalizeLoose(cleaned);
  const pool = languageIsEnglish(language) ? EN_TEMPLATE_TITLES : IT_TEMPLATE_TITLES;
  if (pool.has(loose)) return true;
  if (languageIsEnglish(language) ? ABSTRACT_EN_RE.test(cleaned) : ABSTRACT_IT_RE.test(cleaned)) {
    return true;
  }
  if (/^the\s+[a-z]+(\s+[a-z]+){0,2}$/i.test(cleaned) && cleaned.split(/\s+/).length <= 4) {
    const nouns = cleaned.replace(/^the\s+/i, "");
    if (/^(trigger|threshold|truth|secret|choice|point|crack|spark|beginning|end|turn|shift|break)$/i.test(nouns)) {
      return true;
    }
  }
  return false;
}

function titleSkeleton(value: string): string {
  return normalizeLoose(value)
    .replace(/^(the|a|an|il|la|lo|l'|le|i|gli|un|una)\s+/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export function isRepeatedTitleStructure(candidate: string, previousTitles: string[] = []): boolean {
  const skeleton = titleSkeleton(candidate);
  if (!skeleton) return true;
  return previousTitles.some((prev) => {
    const prevSkeleton = titleSkeleton(prev);
    if (!prevSkeleton) return false;
    if (prevSkeleton === skeleton) return true;
    const candWords = skeleton.split(/\s+/).filter(Boolean);
    const prevWords = prevSkeleton.split(/\s+/).filter(Boolean);
    if (candWords.length >= 2 && prevWords.length >= 2 && candWords[0] === prevWords[0] && candWords[1] === prevWords[1]) {
      return true;
    }
    if (
      candWords[0] &&
      candWords[0] === prevWords[0] &&
      candWords.length <= 3 &&
      prevWords.length <= 3
    ) {
      return true;
    }
    return false;
  });
}

function isBadSummary(value: string): boolean {
  const loose = normalizeLoose(value);
  return (
    !loose ||
    loose === "to be generated" ||
    loose === "da generare" ||
    /^develop chapter \d+/.test(loose) ||
    /^write the \d+/.test(loose) ||
    /^sviluppa il capitolo/.test(loose)
  );
}

function capitalizeTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractProperNounPhrases(text: string): string[] {
  const matches = text.match(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\b/g) || [];
  return matches.map((m) => m.trim()).filter((m) => m.split(/\s+/).length >= 1);
}

function extractQuestionLead(text: string, english: boolean): string {
  const q = text.match(/^(why|how|what|when|where|chi|come|cosa|quando|dove|perche|perché)\b[^.?!]{8,80}/i);
  if (!q) return "";
  const phrase = q[0].replace(/[?:]+$/g, "").trim();
  if (phrase.split(/\s+/).length < 3) return "";
  return capitalizeTitle(phrase.slice(0, 72));
}

function genreKey(config?: Partial<BookConfig>): string {
  const g = `${config?.genre || ""} ${config?.category || ""} ${config?.subcategory || ""}`.toLowerCase();
  if (/histor|rome|ancient|biograph|memoir/.test(g)) return "history";
  if (/business|startup|marketing|money|finance|kdp/.test(g)) return "business";
  if (/self.?help|psychology|wellness|habit|mindset/.test(g)) return "selfhelp";
  if (/fantasy|sci.?fi|magic|epic/.test(g)) return "fantasy";
  if (/romance|dark/.test(g)) return "romance";
  if (/thriller|mystery|crime|noir/.test(g)) return "thriller";
  return "general";
}

export function isBookTitleFragment(title: string, config?: Partial<BookConfig>): boolean {
  const titleLoose = normalizeLoose(title);
  const bookTitle = normalizeLoose(config?.title || "");
  const bookSub = normalizeLoose(config?.subtitle || "");
  if (!titleLoose || !bookTitle) return false;

  if (titleLoose === bookTitle || (bookSub && titleLoose === bookSub)) return true;
  if (bookTitle.includes(titleLoose) && titleLoose.length >= Math.min(10, bookTitle.length * 0.55)) return true;
  if (titleLoose.includes(bookTitle) && bookTitle.length >= titleLoose.length * 0.7) return true;

  const titleTokens = titleLoose.split(/\s+/).filter((t) => t.length > 2);
  const bookTokens = new Set(
    `${bookTitle} ${bookSub}`.split(/\s+/).filter((t) => t.length > 2),
  );
  if (titleTokens.length === 0) return false;
  const overlap = titleTokens.filter((t) => bookTokens.has(t)).length / titleTokens.length;
  return overlap >= 0.75;
}

function bookKeywords(config?: Partial<BookConfig>): string[] {
  const blob = [
    config?.title,
    config?.subtitle,
    config?.category,
    config?.subcategory,
    ...(config?.authorIdentity?.recurringThemes ? [config.authorIdentity.recurringThemes] : []),
  ]
    .filter(Boolean)
    .join(" ");
  return [...new Set(
    blob
      .split(/[^A-Za-zÀ-ÿ0-9']+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 3 && !/^(the|and|with|from|that|this|your|book|chapter)$/i.test(w)),
  )].slice(0, 12);
}

export function buildChapterContentMap(context: ChapterTitleEngineContext, index: number) {
  const config = context.config;
  const summary = String(context.summary || "").trim();
  const blueprint = context.blueprint;
  const themes = blueprint?.themes || [];
  const overview = String(blueprint?.overview || "").trim();
  const emotionalArc = String(blueprint?.emotionalArc || "").trim();

  return {
    bookTitle: config?.title || "",
    bookSubtitle: config?.subtitle || "",
    genre: config?.genre || "",
    category: config?.category || "",
    subcategory: config?.subcategory || "",
    language: context.language || config?.language || "Italian",
    chapterIndex: index,
    chapterGoal: summary,
    themes,
    overview,
    emotionalArc,
    properNouns: extractProperNounPhrases(`${summary} ${overview} ${config?.title || ""}`),
    keywords: bookKeywords(config),
    genreKey: genreKey(config),
  };
}

function phraseFromSummary(summary: string, english: boolean): string {
  if (isBadSummary(summary)) return "";

  const question = extractQuestionLead(summary, english);
  if (question && !isTemplateChapterTitle(question, english ? "English" : "Italian")) {
    return question;
  }

  const sentences = summary.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  for (const sentence of sentences) {
    const stripped = sentence
      .replace(/^(?:in this chapter|this chapter|questo capitolo|il capitolo|chapter \d+)\s+/i, "")
      .replace(/^(?:explores|explore|develops|develop|introduces|introduce|covers|cover|racconta|esplora|sviluppa|introduce|analizza)\s+/i, "")
      .replace(/^(?:how|why|what|come|perche|perché|cosa)\s+/i, "")
      .trim();

    const proper = extractProperNounPhrases(stripped);
    if (proper[0] && proper[0].split(/\s+/).length >= 2) {
      return capitalizeTitle(proper[0].slice(0, 72));
    }

    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      const chunk = words.slice(0, Math.min(7, words.length)).join(" ").replace(/[,;:]+$/g, "");
      if (chunk.length >= 12) return capitalizeTitle(chunk);
    }
  }
  return "";
}

function deriveFromOverview(map: ReturnType<typeof buildChapterContentMap>, index: number): string {
  const sentences = map.overview
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  if (!sentences.length) return "";
  const sentence = sentences[index % sentences.length];
  return phraseFromSummary(sentence, languageIsEnglish(map.language));
}

function composeGenreTitle(map: ReturnType<typeof buildChapterContentMap>, index: number): string {
  const english = languageIsEnglish(map.language);
  const fromOverview = deriveFromOverview(map, index);
  if (fromOverview && !isBookTitleFragment(fromOverview, { title: map.bookTitle, subtitle: map.bookSubtitle, language: map.language })) {
    return fromOverview;
  }

  const proper = map.properNouns.filter((n) => !isBookTitleFragment(n, { title: map.bookTitle, subtitle: map.bookSubtitle }));
  const summaryProper = extractProperNounPhrases(map.chapterGoal).filter(
    (n) => !isBookTitleFragment(n, { title: map.bookTitle, subtitle: map.bookSubtitle }),
  );
  const anchor = summaryProper[0] || proper[0] || map.themes[index % Math.max(1, map.themes.length)] || "";

  switch (map.genreKey) {
    case "history":
      return anchor
        ? capitalizeTitle(`${anchor}${index > 0 ? ` · ${index + 1}` : ""}`.trim())
        : english
          ? `Historical Turn ${index + 1}`
          : `Svolta storica ${index + 1}`;
    case "business":
      return english
        ? `Why Growth Stalls at Step ${index + 1}`
        : `Perche la crescita si ferma al passo ${index + 1}`;
    case "selfhelp":
      return english
        ? `Rewriting Pattern ${index + 1}`
        : `Riscrivere il pattern ${index + 1}`;
    case "fantasy":
      return anchor
        ? capitalizeTitle(`${anchor} Beneath the Mountain`)
        : english
          ? `The Gate Below the Ridge`
          : `Il portale sotto la cresta`;
    case "romance":
      return english
        ? `The Night the Rules Broke`
        : `La notte in cui crollarono le regole`;
    case "thriller":
      return anchor
        ? capitalizeTitle(`${anchor} Changes Everything`)
        : english
          ? `Evidence That Shifts the Case`
          : `L'indizio che cambia il caso`;
    default:
      return anchor
        ? capitalizeTitle(`${anchor}: Chapter Arc ${index + 1}`)
        : english
          ? `Chapter Movement ${index + 1}`
          : `Movimento del capitolo ${index + 1}`;
  }
}

const TITLE_QUALITY_THRESHOLD = 55;

export function scoreChapterTitleQuality(
  title: string,
  summary: string,
  config?: Partial<BookConfig>,
  previousTitles: string[] = [],
): number {
  const cleaned = cleanTitle(title);
  if (!cleaned) return 0;
  if (isTemplateChapterTitle(cleaned, config?.language)) return 0;
  if (isBookTitleFragment(cleaned, config)) return 0;
  let score = 0;
  if (cleaned.split(/\s+/).length >= 2) score += 15;
  if (cleaned.split(/\s+/).length >= 3) score += 10;
  if (!isTemplateChapterTitle(cleaned, config?.language)) score += 25;
  if (!isBookTitleFragment(cleaned, config)) score += 25;

  const titleLoose = normalizeLoose(cleaned);
  const summaryLoose = normalizeLoose(summary);
  const titleTokens = titleLoose.split(/\s+/).filter((t) => t.length > 3);
  const summaryAnchored = titleTokens.some((token) => summaryLoose.includes(token));
  if (summaryAnchored) score += 20;
  if (!isRepeatedTitleStructure(cleaned, previousTitles)) score += 10;
  if (cleaned.length >= 12) score += 5;
  return Math.min(100, score);
}

export function passesChapterTitleQualityTest(
  title: string,
  summary: string,
  config?: Partial<BookConfig>,
  previousTitles: string[] = [],
): boolean {
  return scoreChapterTitleQuality(title, summary, config, previousTitles) >= TITLE_QUALITY_THRESHOLD;
}

export function deriveContentFirstChapterTitle(
  index: number,
  context: ChapterTitleEngineContext,
): string {
  const map = buildChapterContentMap(context, index);
  const english = languageIsEnglish(map.language);
  const summary = String(context.summary || "").trim();

  const fromSummary = phraseFromSummary(summary, english);
  if (fromSummary) return fromSummary;

  const theme = map.themes[index % Math.max(1, map.themes.length)] || "";
  if (theme && theme.split(/\s+/).length >= 2) {
    return capitalizeTitle(theme.slice(0, 72));
  }

  return composeGenreTitle(map, index);
}

export function resolveIntelligentChapterTitle(
  rawTitle: unknown,
  index: number,
  context: ChapterTitleEngineContext = {},
): string {
  const language = context.language || context.config?.language;
  const stripped = cleanTitle(String(rawTitle || "").replace(/^(?:chapter|capitolo)\s*\d+\s*[:.\-–—·]\s*/i, ""));
  const previousTitles = context.previousTitles || [];

  const summary = String(context.summary || "");
  const candidates: string[] = [];

  const fromSummary = phraseFromSummary(summary, languageIsEnglish(language));
  if (fromSummary) candidates.push(fromSummary);

  const strippedValid =
    stripped.length > 3 &&
    !/^to$/i.test(stripped) &&
    !/^to\s+be\s+generated$/i.test(stripped) &&
    !isTemplateChapterTitle(stripped, language) &&
    !isBookTitleFragment(stripped, context.config);

  if (strippedValid) {
    candidates.push(stripped);
  }

  candidates.push(deriveContentFirstChapterTitle(index, context));

  const theme = context.blueprint?.themes?.[index % Math.max(1, context.blueprint?.themes?.length || 1)];
  if (theme && theme.split(/\s+/).length >= 2) candidates.push(capitalizeTitle(theme));

  let best = "";
  let bestScore = -1;
  for (const candidate of candidates) {
    const title = cleanTitle(candidate);
    if (!title) continue;
    const score = scoreChapterTitleQuality(title, summary, context.config, previousTitles);
    if (score > bestScore) {
      best = title;
      bestScore = score;
    }
    if (score >= TITLE_QUALITY_THRESHOLD && !isRepeatedTitleStructure(title, previousTitles)) {
      return title;
    }
  }

  if (best && bestScore >= TITLE_QUALITY_THRESHOLD && !isRepeatedTitleStructure(best, previousTitles)) {
    return best;
  }

  const fallback = deriveContentFirstChapterTitle(index, context);
  let attempt = fallback;
  let n = 1;
  while (
    (isRepeatedTitleStructure(attempt, previousTitles) ||
      isBookTitleFragment(attempt, context.config) ||
      !passesChapterTitleQualityTest(attempt, summary, context.config, previousTitles)) &&
    n < 8
  ) {
    const english = languageIsEnglish(language);
    attempt = english ? `${fallback} · Arc ${n + 1}` : `${fallback} · arco ${n + 1}`;
    n += 1;
  }
  return cleanTitle(attempt) || `Chapter ${index + 1}`;
}
