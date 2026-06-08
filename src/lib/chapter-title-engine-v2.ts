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

function composeGenreTitle(map: ReturnType<typeof buildChapterContentMap>, index: number): string {
  const english = languageIsEnglish(map.language);
  const kw = map.keywords[0] || map.properNouns[0] || map.bookTitle.split(/\s+/)[0] || "";
  const second = map.keywords[1] || map.properNouns[1] || "";

  switch (map.genreKey) {
    case "history":
      return english
        ? capitalizeTitle(`${kw}${second ? ` and ${second}` : ""}`.trim())
        : capitalizeTitle(`${kw}${second ? ` e ${second}` : ""}`.trim());
    case "business":
      return english
        ? `Why ${kw || "Growth"} Breaks Here`
        : `Perche ${kw || "la crescita"} si inceppa qui`;
    case "selfhelp":
      return english
        ? `Rewriting the ${kw || "Inner"} Pattern`
        : `Riscrivere il pattern ${kw || "interiore"}`;
    case "fantasy":
      return english
        ? `The ${kw || "Gate"} Below ${second || "the Mountain"}`
        : `Il ${kw || "portale"} sotto ${second || "la montagna"}`;
    case "romance":
      return english
        ? `The Night ${kw || "He"} Crossed the Line`
        : `La notte in cui ${kw || "lui"} varco il limite`;
    case "thriller":
      return english
        ? `${kw || "Evidence"} That Changes Everything`
        : `${kw || "L'indizio"} che cambia tutto`;
    default:
      return english
        ? `${map.bookTitle}: Movement ${index + 1}`
        : `${map.bookTitle}: movimento ${index + 1}`;
  }
}

export function passesChapterTitleQualityTest(
  title: string,
  summary: string,
  config?: Partial<BookConfig>,
): boolean {
  const cleaned = cleanTitle(title);
  if (!cleaned || cleaned.split(/\s+/).length < 2) return false;
  if (isTemplateChapterTitle(cleaned, config?.language)) return false;

  const titleLoose = normalizeLoose(cleaned);
  const summaryLoose = normalizeLoose(summary);
  const bookLoose = normalizeLoose(`${config?.title || ""} ${config?.subtitle || ""}`);

  const titleTokens = titleLoose.split(/\s+/).filter((t) => t.length > 3);
  const hasSpecificToken = titleTokens.some(
    (token) => summaryLoose.includes(token) || bookLoose.includes(token),
  );

  if (!hasSpecificToken && titleTokens.length < 3) return false;
  return true;
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

  const candidates: string[] = [];
  if (stripped && !isTemplateChapterTitle(stripped, language)) {
    candidates.push(stripped);
  }

  const fromSummary = phraseFromSummary(String(context.summary || ""), languageIsEnglish(language));
  if (fromSummary) candidates.push(fromSummary);

  candidates.push(deriveContentFirstChapterTitle(index, context));

  for (const candidate of candidates) {
    const title = cleanTitle(candidate);
    if (!title) continue;
    if (isTemplateChapterTitle(title, language)) continue;
    if (isRepeatedTitleStructure(title, previousTitles)) continue;
    if (!passesChapterTitleQualityTest(title, String(context.summary || ""), context.config)) continue;
    return title;
  }

  const fallback = deriveContentFirstChapterTitle(index, context);
  let attempt = fallback;
  let n = 1;
  while (isRepeatedTitleStructure(attempt, previousTitles) && n < 6) {
    attempt = `${fallback} · ${n + 1}`;
    n += 1;
  }
  return cleanTitle(attempt) || `Chapter ${index + 1}`;
}
