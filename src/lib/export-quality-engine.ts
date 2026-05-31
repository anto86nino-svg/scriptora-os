import { normalizeExportProject, cleanExportText, exportLabel, parseExportBlocks, cleanMarkdownInline } from "@/lib/export-cleanup";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import type { BookProject } from "@/types/book";
import type { DocxExportPreset, PdfExportPreset } from "./export-presets";

const TECHNICAL_JUNK =
  /\b(undefined|null|NaN|\[object Object\])\b|\[(?:missing|todo)\]/gi;

export type ExportReadinessLabel =
  | "print-ready"
  | "professional-draft"
  | "review-recommended"
  | "incomplete";

export interface ExportPreflightCheck {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

export interface ExportPreflightReport {
  score: number;
  label: ExportReadinessLabel;
  labelText: string;
  checks: ExportPreflightCheck[];
  warnings: string[];
  totalWords: number;
  chapterCount: number;
  hasCover: boolean;
}

export interface PrepareExportOptions {
  profileAuthorName?: string;
}

/** Normalizes and polishes a project before any export format runs. */
export function prepareExportProject(project: BookProject, options: PrepareExportOptions = {}): BookProject {
  const normalized = normalizeExportProject(project) as BookProject;
  const config = { ...normalized.config };

  const profileAuthor = cleanExportText(options.profileAuthorName);
  if (profileAuthor && (!config.author || config.author === "Unknown Author")) {
    config.author = profileAuthor;
    config.authorName = profileAuthor;
    config.writerName = profileAuthor;
  }

  config.title = scrubTechnical(config.title || "Untitled");
  config.subtitle = scrubTechnical(config.subtitle || "");

  const frontMatter = normalized.frontMatter
    ? Object.fromEntries(
        Object.entries(normalized.frontMatter).map(([key, value]) => [key, scrubTechnical(String(value || ""))]),
      )
    : normalized.frontMatter;

  const backMatter = normalized.backMatter
    ? Object.fromEntries(
        Object.entries(normalized.backMatter).map(([key, value]) => [key, scrubTechnical(String(value || ""))]),
      )
    : normalized.backMatter;

  const chapters = (normalized.chapters || []).map((chapter, index) => ({
    ...chapter,
    title: scrubTechnical(
      resolveChapterTitle(chapter.title, index, {
        config,
        summary: normalized.blueprint?.chapterOutlines?.[index]?.summary,
        totalChapters: config.numberOfChapters,
      }),
    ),
    content: scrubTechnical(chapter.content || ""),
    subchapters: (chapter.subchapters || []).map(sub => ({
      ...sub,
      title: scrubTechnical(sub.title || ""),
      content: scrubTechnical(sub.content || ""),
    })),
  }));

  return {
    ...normalized,
    config,
    frontMatter: frontMatter as BookProject["frontMatter"],
    backMatter: backMatter as BookProject["backMatter"],
    chapters,
  };
}

function scrubTechnical(value: string): string {
  return cleanExportText(value)
    .replace(TECHNICAL_JUNK, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countExportWords(project: BookProject): number {
  return (project.chapters || []).reduce((sum, chapter) => {
    const chapterWords = String(chapter.content || "").split(/\s+/).filter(Boolean).length;
    const subWords = (chapter.subchapters || []).reduce(
      (subSum, sub) => subSum + String(sub.content || "").split(/\s+/).filter(Boolean).length,
      0,
    );
    return sum + chapterWords + subWords;
  }, 0);
}

export function chaptersWithContent(project: BookProject): number {
  return (project.chapters || []).filter(ch =>
    String(ch.content || "").trim() ||
    (ch.subchapters || []).some(sub => String(sub.content || "").trim()),
  ).length;
}

function readinessLabel(score: number): { label: ExportReadinessLabel; labelText: string } {
  if (score >= 90) return { label: "print-ready", labelText: "Print-ready" };
  if (score >= 75) return { label: "professional-draft", labelText: "Professional draft" };
  if (score >= 60) return { label: "review-recommended", labelText: "Review recommended" };
  return { label: "incomplete", labelText: "Incomplete manuscript" };
}

export function analyzeExportPreflight(
  project: BookProject,
  options: { hasCover?: boolean; format?: string; pdfPreset?: PdfExportPreset; docxPreset?: DocxExportPreset } = {},
): ExportPreflightReport {
  const prepared = prepareExportProject(project);
  const warnings: string[] = [];
  let score = 0;

  const title = prepared.config.title?.trim();
  const author = (prepared.config.authorName || prepared.config.author || prepared.config.writerName || "").trim();
  const hasRealAuthor = !!author && author !== "Unknown Author";
  const totalWords = countExportWords(prepared);
  const filledChapters = chaptersWithContent(prepared);
  const chapterCount = prepared.chapters?.length || 0;
  const copyright = String(prepared.frontMatter?.copyright || "").trim();
  const hasFrontMatter = !!(
    prepared.frontMatter?.dedication ||
    prepared.frontMatter?.letterToReader ||
    prepared.frontMatter?.aboutAuthor ||
    prepared.frontMatter?.howToUse
  );
  const hasBackMatter = !!(
    prepared.backMatter?.conclusion ||
    prepared.backMatter?.authorNote ||
    prepared.backMatter?.callToAction
  );
  const hasCover = !!options.hasCover;

  if (title && title !== "Untitled" && title !== "Senza titolo") score += 15;
  else warnings.push("Title missing — a clean working title will be used in the file.");

  if (hasRealAuthor) score += 15;
  else warnings.push("Author not set — the active profile name or a clean fallback will be used.");

  if (filledChapters >= 1) score += 10;
  if (filledChapters >= Math.max(1, chapterCount * 0.8)) score += 10;
  else if (chapterCount > 0) warnings.push("Some chapters are empty — export will skip blank sections.");

  if (totalWords >= 5000) score += 10;
  else if (totalWords >= 1500) {
    score += 6;
    warnings.push("Manuscript is short — fine for a sample, but review length before publishing.");
  } else {
    score += 2;
    warnings.push("Very short manuscript — best for review copies, not final publication.");
  }

  if (copyright.includes("©")) score += 10;
  else warnings.push("Copyright page will be generated automatically with the author name and year.");

  if (hasFrontMatter) score += 8;
  if (hasBackMatter) score += 7;

  if (hasCover) score += 10;
  else if (options.format === "epub") {
    warnings.push("No cover yet — you can export anyway; add one later for a richer EPUB.");
  } else if (options.format === "pdf") {
    warnings.push("No cover attached — interior PDF will still export cleanly.");
  }

  const shortChapters = (prepared.chapters || []).filter(
    ch => String(ch.content || "").split(/\s+/).filter(Boolean).length < 250,
  ).length;
  if (shortChapters >= 2) {
    warnings.push(`${shortChapters} chapters are very short — check pacing before publication.`);
  }

  if (options.format === "pdf" && options.pdfPreset === "kdp-6x9") {
    score = Math.min(100, score + 2);
  }

  score = Math.max(0, Math.min(100, score));
  const { label, labelText } = readinessLabel(score);

  const checks: ExportPreflightCheck[] = [
    { id: "title", label: "Title", ok: !!title, detail: title || "Missing" },
    { id: "author", label: "Author", ok: hasRealAuthor, detail: hasRealAuthor ? author : "Fallback" },
    { id: "chapters", label: "Chapters", ok: filledChapters > 0, detail: `${filledChapters}/${chapterCount}` },
    { id: "words", label: "Word count", ok: totalWords >= 1500, detail: totalWords.toLocaleString() },
    { id: "copyright", label: "Copyright", ok: copyright.includes("©"), detail: copyright ? "Present" : "Auto-generated" },
    { id: "front", label: "Front matter", ok: hasFrontMatter, detail: hasFrontMatter ? "Present" : "Optional" },
    { id: "back", label: "Back matter", ok: hasBackMatter, detail: hasBackMatter ? "Present" : "Optional" },
    { id: "cover", label: "Cover", ok: hasCover, detail: hasCover ? "Attached" : "Not attached" },
    { id: "format", label: "Format", ok: true, detail: (options.format || "—").toUpperCase() },
  ];

  return {
    score,
    label,
    labelText,
    checks,
    warnings,
    totalWords,
    chapterCount,
    hasCover,
  };
}

function chapterPlainText(project: BookProject, index: number): string {
  const chapter = project.chapters[index];
  if (!chapter) return "";
  const title = resolveChapterTitle(chapter.title, index, {
    config: project.config,
    summary: project.blueprint?.chapterOutlines?.[index]?.summary,
    totalChapters: project.config.numberOfChapters,
  });
  const display = formatChapterDisplayTitle(index, title, {
    config: project.config,
    summary: project.blueprint?.chapterOutlines?.[index]?.summary,
    totalChapters: project.config.numberOfChapters,
  });
  const parts = [`${display}\n`, ...parseExportBlocks(chapter.content).map(block => blockToPlain(block))];
  for (const sub of chapter.subchapters || []) {
    if (!sub.content) continue;
    parts.push(`\n${cleanMarkdownInline(sub.title)}\n`);
    parts.push(...parseExportBlocks(sub.content).map(block => blockToPlain(block)));
  }
  return parts.filter(Boolean).join("\n\n").trim();
}

function blockToPlain(block: ReturnType<typeof parseExportBlocks>[number]): string {
  if (block.type === "paragraph") return block.text;
  if (block.type === "heading2") return `\n${block.text}\n`;
  if (block.type === "heading3") return `\n${block.text}\n`;
  if (block.type === "scene") return "✦ ✦ ✦";
  if (block.type === "bullet") return block.items.map(item => `• ${item}`).join("\n");
  if (block.type === "numbered") return block.items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  return "";
}

export function generatePlainTextExport(project: BookProject, options: PrepareExportOptions = {}): string {
  const prepared = prepareExportProject(project, options);
  const author = prepared.config.authorName || prepared.config.author || "Unknown Author";
  const lines: string[] = [
    prepared.config.title,
    prepared.config.subtitle || "",
    author,
    "",
  ];

  if (prepared.frontMatter?.copyright) {
    lines.push(exportLabel("copyright", prepared.config.language), prepared.frontMatter.copyright, "");
  }

  lines.push(exportLabel("contents", prepared.config.language));
  prepared.chapters.forEach((ch, i) => {
    lines.push(formatChapterDisplayTitle(i, ch.title, {
      config: prepared.config,
      summary: prepared.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: prepared.config.numberOfChapters,
    }));
  });
  lines.push("");

  prepared.chapters.forEach((_, i) => {
    lines.push(chapterPlainText(prepared, i), "");
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function generateMarkdownExport(project: BookProject, options: PrepareExportOptions = {}): string {
  const prepared = prepareExportProject(project, options);
  const author = prepared.config.authorName || prepared.config.author || "Unknown Author";
  const lines: string[] = [
    `# ${prepared.config.title}`,
    prepared.config.subtitle ? `## ${prepared.config.subtitle}` : "",
    `*${author}*`,
    "",
  ].filter(Boolean);

  if (prepared.frontMatter?.copyright) {
    lines.push(`## ${exportLabel("copyright", prepared.config.language)}`, "", prepared.frontMatter.copyright, "");
  }

  lines.push(`## ${exportLabel("contents", prepared.config.language)}`, "");
  prepared.chapters.forEach((ch, i) => {
    lines.push(`- ${formatChapterDisplayTitle(i, ch.title, {
      config: prepared.config,
      summary: prepared.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: prepared.config.numberOfChapters,
    })}`);
  });
  lines.push("");

  prepared.chapters.forEach((_, i) => {
    const chapter = prepared.chapters[i];
    const title = formatChapterDisplayTitle(i, chapter.title, {
      config: prepared.config,
      summary: prepared.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: prepared.config.numberOfChapters,
    });
    lines.push(`## ${title}`, "", chapterPlainText(prepared, i), "");
  });

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Guard for tests — exported text must never leak technical placeholders. */
export function assertExportTextClean(text: string): string[] {
  const issues: string[] = [];
  if (/\bundefined\b/i.test(text)) issues.push("contains 'undefined'");
  if (/\bnull\b/i.test(text) && !/\bnulla\b/i.test(text)) issues.push("contains 'null'");
  if (/\[missing\]/i.test(text)) issues.push("contains '[missing]'");
  if (/\[object Object\]/i.test(text)) issues.push("contains '[object Object]'");
  return issues;
}
