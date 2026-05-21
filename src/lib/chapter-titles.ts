import type { BookConfig, BookProject } from "@/types/book";

type ChapterTitleContext = {
  config?: Partial<BookConfig>;
  summary?: string;
  totalChapters?: number;
  language?: string;
};

const GENERIC_TITLE_RE =
  /^(?:chapter|capitolo|chapitre|kapitel|capitulo|capitulo|cap\.?|ch\.?)\s*\d+$/i;
const PLACEHOLDER_TITLE_RE =
  /^(?:untitled|senza titolo|to be generated|da generare|chapter title|titolo capitolo|titolo del capitolo)$/i;
const CHAPTER_PREFIX_RE =
  /^(?:chapter|capitolo|chapitre|kapitel|capitulo|capitulo|cap\.?|ch\.?)\s*\d+\s*(?:[:.\-–—·]\s*)?/i;

const ITALIAN_FALLBACK_TITLES = [
  "L'innesco",
  "La prima crepa",
  "Il desiderio nascosto",
  "La soglia",
  "La scelta difficile",
  "Il punto di rottura",
  "La promessa sospesa",
  "La distanza necessaria",
  "Il segreto in superficie",
  "La notte della verita",
  "Il prezzo del silenzio",
  "La mappa del conflitto",
  "La ferita che parla",
  "Il passo oltre",
  "La tensione che resta",
  "La prova decisiva",
  "Il ritorno dell'ombra",
  "La risposta inattesa",
  "Il cuore della storia",
  "La linea da attraversare",
  "La conseguenza",
  "Il nodo finale",
  "La resa dei conti",
  "L'ultima soglia",
  "La promessa mantenuta",
  "Il nuovo inizio",
  "La forma del cambiamento",
  "La scelta definitiva",
  "Dopo la tempesta",
  "La porta aperta",
];

const ENGLISH_FALLBACK_TITLES = [
  "The Spark",
  "The First Crack",
  "The Hidden Want",
  "The Threshold",
  "The Difficult Choice",
  "The Breaking Point",
  "The Suspended Promise",
  "The Necessary Distance",
  "The Secret at the Surface",
  "The Night of Truth",
  "The Price of Silence",
  "The Map of Conflict",
  "The Speaking Wound",
  "The Step Beyond",
  "The Tension That Remains",
  "The Decisive Test",
  "The Returning Shadow",
  "The Unexpected Answer",
  "The Heart of the Story",
  "The Line to Cross",
  "The Consequence",
  "The Final Knot",
  "The Reckoning",
  "The Last Threshold",
  "The Kept Promise",
  "The New Beginning",
  "The Shape of Change",
  "The Final Choice",
  "After the Storm",
  "The Open Door",
];

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

export function stripChapterTitlePrefix(value: unknown): string {
  return cleanTitle(value)
    .replace(CHAPTER_PREFIX_RE, "")
    .replace(/^\d+\s*(?:[.)\-:–—·]\s*)?/, "")
    .trim();
}

export function isGenericChapterTitle(value: unknown): boolean {
  const cleaned = cleanTitle(value);
  if (!cleaned) return true;
  const loose = normalizeLoose(cleaned);
  return (
    /^\d+$/.test(loose) ||
    GENERIC_TITLE_RE.test(loose) ||
    PLACEHOLDER_TITLE_RE.test(loose)
  );
}

function isBadSummary(value: string): boolean {
  const loose = normalizeLoose(value);
  return (
    !loose ||
    loose === "to be generated" ||
    loose === "da generare" ||
    /^develop chapter \d+/.test(loose) ||
    /^write the \d+/.test(loose)
  );
}

function titleFromSummary(summary?: string): string {
  const clean = String(summary || "").replace(/\s+/g, " ").trim();
  if (isBadSummary(clean)) return "";

  const firstSentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  const candidate = firstSentence
    .replace(/^(?:in this chapter|this chapter|questo capitolo|il capitolo)\s+/i, "")
    .replace(/^(?:explores|explore|develops|develop|introduces|introduce|racconta|esplora|sviluppa|introduce)\s+/i, "")
    .replace(/^(?:how|come)\s+/i, "")
    .trim();

  if (isGenericChapterTitle(candidate)) return "";
  const words = candidate.split(/\s+/).filter(Boolean).slice(0, 8);
  if (words.length < 2) return "";
  const title = words.join(" ").replace(/[,;:]+$/g, "").trim();
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
}

function fallbackTitle(index: number, context: ChapterTitleContext = {}): string {
  const language = context.language || context.config?.language || "Italian";
  const pool = language === "English" ? ENGLISH_FALLBACK_TITLES : ITALIAN_FALLBACK_TITLES;
  const base = pool[index % pool.length];
  if (index < pool.length) return base;
  return language === "English" ? `${base} Revisited` : `${base} ritrovata`;
}

export function resolveChapterTitle(
  rawTitle: unknown,
  index: number,
  context: ChapterTitleContext = {},
): string {
  const stripped = stripChapterTitlePrefix(rawTitle);
  if (!isGenericChapterTitle(stripped)) return stripped;

  const fromSummary = titleFromSummary(context.summary);
  if (fromSummary) return fromSummary;

  return fallbackTitle(index, context);
}

export function chapterLabelWord(language?: string): string {
  switch (language) {
    case "English":
      return "Chapter";
    case "Spanish":
      return "Capitulo";
    case "French":
      return "Chapitre";
    case "German":
      return "Kapitel";
    default:
      return "Capitolo";
  }
}

export function formatChapterDisplayTitle(
  index: number,
  rawTitle: unknown,
  context: ChapterTitleContext = {},
): string {
  const language = context.language || context.config?.language;
  const title = resolveChapterTitle(rawTitle, index, context);
  return `${chapterLabelWord(language)} ${index + 1}: ${title}`;
}

export function normalizeProjectChapterTitles(project: BookProject): BookProject {
  const totalChapters = project.config?.numberOfChapters || project.blueprint?.chapterOutlines?.length || project.chapters?.length || 0;
  const blueprint = project.blueprint
    ? {
        ...project.blueprint,
        chapterOutlines: project.blueprint.chapterOutlines.map((outline, index) => ({
          ...outline,
          title: resolveChapterTitle(outline?.title, index, {
            config: project.config,
            summary: outline?.summary,
            totalChapters,
          }),
        })),
      }
    : project.blueprint;

  const chapters = (project.chapters || []).map((chapter, index) => {
    const outline = blueprint?.chapterOutlines?.[index];
    return {
      ...chapter,
      title: resolveChapterTitle(chapter?.title || outline?.title, index, {
        config: project.config,
        summary: outline?.summary,
        totalChapters,
      }),
    };
  });

  return { ...project, blueprint, chapters };
}
