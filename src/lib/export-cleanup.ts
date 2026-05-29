import { resolveChapterTitle } from "@/lib/chapter-titles";

type AnyBookProject = any;

const DEFAULT_AUTHOR = "Unknown Author";

function stripCodeFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeSmartJson(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u0000/g, "")
    .trim();
}

function tryParseObject(value: unknown): Record<string, any> | null {
  if (typeof value !== "string") return null;

  const cleaned = normalizeSmartJson(stripCodeFence(value));

  if (!cleaned.startsWith("{") || !cleaned.endsWith("}")) return null;

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}


function pickMatterField(raw: unknown, field: string): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw !== "string") return cleanExportText(raw);

  const parsed = tryParseObject(raw);
  if (parsed && typeof parsed[field] === "string") {
    return cleanExportText(parsed[field]);
  }

  return cleanExportText(raw);
}

function firstClean(...values: unknown[]): string {
  for (const value of values) {
    const cleaned = cleanExportText(value);
    if (cleaned.trim()) return cleaned.trim();
  }
  return "";
}

function sanitizeCopyrightField(value: unknown, author: string): string {
  let t = cleanExportText(value);

  const copyrightIndex = t.indexOf("©");
  if (copyrightIndex > 0) {
    t = t.slice(copyrightIndex).trim();
  }

  t = t
    .replace(/Lettera al Lettore[\s\S]*?©/i, "©")
    .replace(/A chi ha[\s\S]*$/i, "")
    .replace(/ISBN:\s*[“"]?\s*,[\s\S]*$/i, "ISBN: ")
    .trim();

  if (!t || !t.includes("©")) {
    return `© ${new Date().getFullYear()} ${author}. Tutti i diritti riservati.`;
  }

  return t;
}

function looksLikeRawMatterJson(value: string): boolean {
  const text = normalizeSmartJson(value);
  return (
    text.includes('"titlePage"') ||
    text.includes('"letterToReader"') ||
    text.includes('"aboutAuthor"') ||
    text.includes('"howToUse"') ||
    text.includes('"dedication"')
  );
}

export function cleanExportText(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  const parsed = tryParseObject(text);
  if (parsed) {
    // Non unire mai tutti i valori del front matter:
    // copyright, dedica e lettera devono restare campi separati.
    return "";
  }

  if (looksLikeRawMatterJson(text)) {
    // Fallback for malformed JSON-like blocks: remove braces/keys instead of printing code.
    text = normalizeSmartJson(text)
      .replace(/^\s*\{/, "")
      .replace(/\}\s*$/, "")
      .replace(/"titlePage"\s*:\s*"/g, "")
      .replace(/"copyright"\s*:\s*"/g, "")
      .replace(/"dedication"\s*:\s*"/g, "")
      .replace(/"aboutAuthor"\s*:\s*"/g, "")
      .replace(/"howToUse"\s*:\s*"/g, "")
      .replace(/"letterToReader"\s*:\s*"/g, "")
      .replace(/",\s*"/g, "\n\n")
      .replace(/"\s*,?\s*$/g, "");
  }

  return text
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\bAUTH-[A-Z0-9-]+\b/g, "")
    .replace(/\bauth-[a-z0-9-]+\b/g, "")
    .replace(/\[da inserire\]/gi, "")
    .replace(/\[Nome dell.?Autore o Editore\]/gi, "")
    .replace(/\[Nome dell.?Autore\]/gi, "")
    .replace(/\[da assegnare\]/gi, "")
    .replace(/Autore:\s*$/gim, `Autore: ${DEFAULT_AUTHOR}`)
    .replace(/©\s*2025\s*\.\s*/g, `© ${new Date().getFullYear()} ${DEFAULT_AUTHOR}. `)
    .replace(/©\s*2026\s*\.\s*/g, `© ${new Date().getFullYear()} ${DEFAULT_AUTHOR}. `)
    .replace(/Czes.?aw Mi.?osz/g, "Czesław Miłosz")
    .replace(/Czes[\u0000-\u001F]?Baw Mi[\u0000-\u001F]?Bosz/g, "Czesław Miłosz")
    .trim();
}

function mergeMatterFromEmbeddedJson(matter: any): any {
  if (!matter || typeof matter !== "object") return {};

  const embeddedSources = [
    matter.titlePage,
    matter.copyright,
    matter.dedication,
    matter.aboutAuthor,
    matter.howToUse,
    matter.letterToReader,
    matter.conclusion,
    matter.authorNote,
    matter.callToAction,
    matter.reviewRequest,
    matter.otherBooks,
    matter.followAuthor,
  ];

  let embedded: Record<string, any> = {};
  for (const src of embeddedSources) {
    const parsed = tryParseObject(src);
    if (parsed) embedded = { ...embedded, ...parsed };
  }

  const keys = [
    "titlePage",
    "copyright",
    "dedication",
    "aboutAuthor",
    "howToUse",
    "letterToReader",
    "conclusion",
    "authorNote",
    "callToAction",
    "reviewRequest",
    "otherBooks",
    "followAuthor",
  ];

  const merged: Record<string, any> = { ...embedded, ...matter };

  for (const key of keys) {
    merged[key] = firstClean(
      pickMatterField(embedded[key], key),
      pickMatterField(matter[key], key),
    );
  }

  return merged;
}


function repairDirtyFrontMatter(frontMatter: any, author: string): any {
  const original = frontMatter || {};

  const blob = [
    original.titlePage,
    original.copyright,
    original.dedication,
    original.aboutAuthor,
    original.howToUse,
    original.letterToReader,
  ]
    .map((v) => typeof v === "string" ? v : "")
    .filter(Boolean)
    .join("\n\n");

  const repaired = { ...original };

  // COPYRIGHT: deve partire da © o essere rigenerato.
  let copyright = cleanExportText(original.copyright);
  if (
    /Lettera al Lettore/i.test(copyright) ||
    /A chi ha/i.test(copyright) ||
    /Dedica/i.test(copyright) ||
    /Autore:\s*[“"]?\s*,/i.test(copyright)
  ) {
    copyright = "";
  }

  if (!copyright && blob.includes("©")) {
    copyright = cleanExportText(
      blob
        .slice(blob.indexOf("©"))
        .replace(/ISBN:\s*[“"]?\s*,[\s\S]*$/i, "ISBN:")
        .replace(/A chi ha[\s\S]*$/i, "")
        .replace(/Lettera al Lettore[\s\S]*$/i, "")
    );
  }

  if (!copyright || !copyright.includes("©")) {
    copyright = `© ${new Date().getFullYear()} ${author}. Tutti i diritti riservati.`;
  }

  // DEDICA: prova a recuperare la parte che inizia con "A chi..."
  let dedication = cleanExportText(original.dedication);
  if (!dedication || /©|Copyright|ISBN|Lettera al Lettore/i.test(dedication)) {
    const m = blob.match(/(A chi[\s\S]*?)(?=\n\n|©|Copyright|ISBN|Lettera al Lettore|$)/i);
    dedication = m ? cleanExportText(m[1]) : "";
  }

  // LETTERA: non deve contenere copyright/dedica/isbn.
  let letterToReader = cleanExportText(original.letterToReader);
  if (!letterToReader || /©|Copyright|ISBN|A chi ha/i.test(letterToReader)) {
    const m = blob.match(/Lettera al Lettore\s*([\s\S]*?)(?=©|Copyright|ISBN|A chi ha|Dedica|$)/i);
    letterToReader = m ? cleanExportText(m[1]) : "";
  }

  letterToReader = cleanExportText(
    letterToReader
      .replace(/^Lettera al Lettore\s*/i, "")
      .replace(/Autore:\s*[“"]?\s*,?\s*$/i, "")
  );

  repaired.copyright = copyright;
  repaired.dedication = dedication;
  repaired.letterToReader = letterToReader;

  return repaired;
}


function cleanAuthorSlug(value: unknown): string {
  const text = cleanExportText(value);
  if (!text) return "";
  if (/^auth-[a-z0-9-]+$/i.test(text)) return "";
  if (/^AUTH-[A-Z0-9-]+$/i.test(text)) return "";
  return text;
}

export function normalizeExportProject(project: AnyBookProject): AnyBookProject {
  const config = { ...(project?.config || {}) };
  const frontMatter = mergeMatterFromEmbeddedJson(project?.frontMatter || {});
  const backMatter = mergeMatterFromEmbeddedJson(project?.backMatter || {});

  const author =
    cleanAuthorSlug(config.author) ||
    cleanAuthorSlug(config.authorName) ||
    cleanAuthorSlug(config.writerName) ||
    DEFAULT_AUTHOR;

  config.author = author;
  config.authorName = author;
  config.writerName = author;
  config.title = cleanExportText(config.title || project?.title || "Senza titolo");

  frontMatter.titlePage = cleanExportText(frontMatter.titlePage || `${config.title}\n\nAutore: ${author}`);

  Object.assign(frontMatter, repairDirtyFrontMatter(frontMatter, author));

  frontMatter.copyright = sanitizeCopyrightField(
    frontMatter.copyright || `© ${new Date().getFullYear()} ${author}. Tutti i diritti riservati.`,
    author
  );

  const chapters = Array.isArray(project?.chapters)
    ? project.chapters.map((chapter: any, index: number) => {
        const title = cleanExportText(resolveChapterTitle(chapter?.title, index, {
          config,
          summary: project?.blueprint?.chapterOutlines?.[index]?.summary,
          totalChapters: config.numberOfChapters,
        }));
        return {
          ...chapter,
          title,
          content: stripChapterEcho(chapter?.content || "", title, config.language, index + 1),
          subchapters: Array.isArray(chapter?.subchapters)
            ? chapter.subchapters.map((sub: any) => ({
                ...sub,
                title: cleanExportText(sub?.title || ""),
                content: cleanExportText(sub?.content || ""),
              }))
            : [],
        };
      })
    : [];

  return {
    ...project,
    config,
    frontMatter,
    chapters,
    backMatter,
  };
}


export type ExportBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading2"; text: string }
  | { type: "heading3"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "scene"; text?: string };

export function cleanMarkdownInline(value: unknown): string {
  return cleanExportText(value)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/  +/g, " ")
    .replace(/(^|[\s(])"/g, "$1\u201C")
    .replace(/"/g, "\u201D")
    .replace(/(^|[\s(])'/g, "$1\u2018")
    .replace(/'/g, "\u2019")
    .replace(/--/g, "\u2014")
    .replace(/\.\.\./g, "\u2026")
    .trim();
}

export function stripChapterEcho(content: unknown, title?: string, language?: string, chapterNumber?: number): string {
  let text = cleanExportText(content);
  const cleanTitle = cleanMarkdownInline(title || "");
  const chapterLabel = exportLabel("chapter", language);

  const lines = text.split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();

  const killTop = () => {
    while (lines.length && !lines[0].trim()) lines.shift();
    if (lines.length) lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  };

  for (let i = 0; i < 4 && lines.length; i++) {
    const first = cleanMarkdownInline(lines[0]);
    const isChapterLine =
      !!chapterNumber &&
      new RegExp(`^(${chapterLabel}|chapter|capitolo)\\s+${chapterNumber}\\b`, "i").test(first);
    const isSameTitle =
      !!cleanTitle &&
      first.toLowerCase().replace(/\s+/g, " ").trim() === cleanTitle.toLowerCase().replace(/\s+/g, " ").trim();

    if (isChapterLine || isSameTitle) killTop();
    else break;
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseExportBlocks(value: unknown): ExportBlock[] {
  const text = cleanExportText(value);
  if (!text) return [];

  const blocks: ExportBlock[] = [];
  const lines = text.split("\n");
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flushParagraph = () => {
    const joined = paragraph.join(" ").replace(/\s+/g, " ").trim();
    if (joined) blocks.push({ type: "paragraph", text: cleanMarkdownInline(joined) });
    paragraph = [];
  };
  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: "bullet", items: bullets.map(cleanMarkdownInline).filter(Boolean) });
    bullets = [];
  };
  const flushNumbers = () => {
    if (numbers.length) blocks.push({ type: "numbered", items: numbers.map(cleanMarkdownInline).filter(Boolean) });
    numbers = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushNumbers();
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushAll();
      continue;
    }

    if (/^[-*_]{3,}$/.test(line) || /^[✦*#\u2022\u2014\-\s]+$/.test(line) && line.length < 12) {
      flushAll();
      blocks.push({ type: "scene" });
      continue;
    }

    const h = line.match(/^(#{2,4})\s+(.+)$/);
    if (h) {
      flushAll();
      blocks.push({ type: h[1].length >= 3 ? "heading3" : "heading2", text: cleanMarkdownInline(h[2]) });
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      flushNumbers();
      bullets.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+[\.)]\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      flushBullets();
      numbers.push(numbered[1]);
      continue;
    }

    flushBullets();
    flushNumbers();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}

export function exportLabel(key: string, language?: string): string {
  const isItalian = String(language || "").toLowerCase().startsWith("it");

  const it: Record<string, string> = {
    contents: "Indice",
    chapter: "Capitolo",
    copyright: "Copyright",
    dedication: "Dedica",
    aboutAuthor: "Nota sull’autore",
    howToUse: "Come usare questo libro",
    letterToReader: "Lettera al lettore",
    conclusion: "Conclusione",
    authorNote: "Nota dell’autore",
    whatsNext: "Prossimo passo",
    smallRequest: "Una piccola richiesta",
    otherBooks: "Letture consigliate",
    followAuthor: "Segui l'autore",
  };

  const en: Record<string, string> = {
    contents: "Contents",
    chapter: "Chapter",
    copyright: "Copyright",
    dedication: "Dedication",
    aboutAuthor: "About the Author",
    howToUse: "How to Use This Book",
    letterToReader: "Letter to the Reader",
    conclusion: "Conclusion",
    authorNote: "Author's Note",
    whatsNext: "What's Next",
    smallRequest: "A Small Request",
    otherBooks: "Other Books",
    followAuthor: "Follow the Author",
  };

  return (isItalian ? it : en)[key] || key;
}
