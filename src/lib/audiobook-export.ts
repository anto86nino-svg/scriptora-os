import type { BookProject } from "@/types/book";
import { resolveChapterTitle } from "@/lib/chapter-titles";
import { resolveExportAuthorName } from "@/lib/export-author";
import { cleanExportText } from "@/lib/export-cleanup";
import { saveBlobAs } from "@/lib/save-file";

export const DEFAULT_AUDIOBOOK_WPM = 150;

export interface AudiobookChapter {
  id: string;
  index: number;
  title: string;
  text: string;
  wordCount: number;
  estimatedMinutes: number;
}

/** @deprecated Use AudiobookChapter */
export type AudiobookChapterSegment = AudiobookChapter;

export interface AudiobookManifest {
  version: 1;
  title: string;
  subtitle: string;
  author: string;
  penName: string;
  language: string;
  chapterCount: number;
  totalWords: number;
  estimatedTotalMinutes: number;
  chapters: AudiobookChapter[];
  narratorNotes: string[];
  generatedAt: string;
  exportMode: "script_and_listen_only";
}

export interface AudiobookScript {
  manifest: AudiobookManifest;
  plainText: string;
}

const UI_LEAK_PATTERNS: RegExp[] = [
  /^Tap\s+/i,
  /^Click\s+/i,
  /^Select\s+(a\s+)?chapter/i,
  /^Genera\s+capitolo/i,
  /^Export\s+Studio/i,
  /^Voice\s+Studio/i,
  /^Scriptora\s+OS/i,
  /^Genre\s+Coach/i,
  /^Analysis\s+Pro/i,
  /^Chapter\s+Intelligence/i,
  /^Writer\s+Studio/i,
  /^Molly\s+Brain/i,
  /^Nessun\s+/i,
  /^Loading\.\.\./i,
  /^\[placeholder\]/i,
  /^TODO:/i,
  /^Ascolta\s+anteprima/i,
  /^Scarica\s+copione/i,
];

const PROMPT_LEAK_PATTERNS: RegExp[] = [
  /^TOTAL CHAPTER TARGET/i,
  /^TARGET WORD COUNT/i,
  /^CONTINUITY RULES/i,
  /^NARRATIVE MEMORY/i,
  /^CHUNK_START/i,
  /^CHUNK_END/i,
  /^<system>/i,
  /^\[Scriptora\]/i,
  /^\[Nexora\]/i,
  /^STYLE LOCK/i,
  /^GENRE LOCK/i,
];

const INLINE_CONTAMINATION_PATTERNS: RegExp[] = [
  /Genre Coach/gi,
  /Analysis Pro/gi,
  /Export Studio/gi,
  /Chapter Intelligence/gi,
  /Writer Studio/gi,
  /Voice Studio/gi,
  /Scriptora OS/gi,
  /Molly Brain/gi,
  /\[da inserire\]/gi,
  /\[placeholder\]/gi,
  /AUTH-[A-Z0-9-]+/g,
];

export function sanitizeAudiobookText(text: string): string {
  let clean = cleanExportText(text);

  for (const pattern of INLINE_CONTAMINATION_PATTERNS) {
    clean = clean.replace(pattern, " ");
  }

  clean = clean
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_{1,2}(.*?)_{1,2}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[(?:tap|click|select|genera|export|voice|scriptora|nexora)[^\]]*\]/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[•▪►▶◆★☆]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      if (UI_LEAK_PATTERNS.some((rx) => rx.test(p))) return false;
      if (PROMPT_LEAK_PATTERNS.some((rx) => rx.test(p))) return false;
      return true;
    });

  return paragraphs.join("\n\n");
}

export function countAudiobookWords(text: string): number {
  return sanitizeAudiobookText(text).split(/\s+/).filter(Boolean).length;
}

export function estimateAudiobookDuration(text: string, wpm = DEFAULT_AUDIOBOOK_WPM): number {
  const words = countAudiobookWords(text);
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / wpm));
}

export function formatAudiobookDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

export function splitBookIntoAudioChapters(project: BookProject): AudiobookChapter[] {
  const language = project.config.language || "Italian";
  const chapters = project.chapters || [];

  return chapters
    .map((chapter, index) => {
      const raw = [chapter.content, ...(chapter.subchapters || []).map((s) => s.content)]
        .filter(Boolean)
        .join("\n\n");
      const text = sanitizeAudiobookText(raw);
      const title = cleanExportText(
        resolveChapterTitle(chapter.title, index, { language, totalChapters: chapters.length }),
      ) || `Capitolo ${index + 1}`;
      const wordCount = countAudiobookWords(text);

      return {
        id: `${project.id}-ch-${index}`,
        index,
        title,
        text,
        wordCount,
        estimatedMinutes: estimateAudiobookDuration(text),
      };
    })
    .filter((segment) => segment.wordCount > 0);
}

export function buildAudiobookManifest(project: BookProject): AudiobookManifest {
  const chapters = splitBookIntoAudioChapters(project);
  const config = project.config as Record<string, unknown>;
  const author = resolveExportAuthorName(config) || project.config.authorName || project.config.author || "";
  const identity = project.config.authorIdentity as { penName?: string } | undefined;
  const penName = String(identity?.penName || (project.config as { penName?: string }).penName || author || "");
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const estimatedTotalMinutes = chapters.reduce((sum, ch) => sum + ch.estimatedMinutes, 0);

  return {
    version: 1,
    title: cleanExportText(project.config.title) || "Senza titolo",
    subtitle: cleanExportText(project.config.subtitle) || "",
    author: author || penName,
    penName,
    language: project.config.language || "Italian",
    chapterCount: chapters.length,
    totalWords,
    estimatedTotalMinutes,
    chapters,
    narratorNotes: [
      "[Pausa breve] tra paragrafi ravvicinati.",
      "[Pausa lunga] tra capitoli.",
      "Rispetta la punteggiatura originale per il ritmo narrativo.",
    ],
    generatedAt: new Date().toISOString(),
    exportMode: "script_and_listen_only",
  };
}

export function buildAudiobookScript(project: BookProject): AudiobookScript {
  const manifest = buildAudiobookManifest(project);

  const headerBlock = [
    manifest.title,
    manifest.subtitle,
    manifest.author ? `Autore: ${manifest.author}` : "",
    `Lingua: ${manifest.language}`,
    "",
    "[Pausa breve]",
  ].filter(Boolean);

  const body = manifest.chapters
    .map((chapter, chapterIdx) => {
      const sectionHeader = `Capitolo ${chapter.index + 1}. ${chapter.title}`;
      const chapterIntro = chapterIdx === 0 ? "" : "\n[Pausa lunga]\n";
      return `${chapterIntro}${sectionHeader}\n\n${chapter.text}\n\n[Pausa breve]`;
    })
    .join("\n\n");

  const plainText = [...headerBlock, "", body].join("\n");

  return { manifest, plainText };
}

export function audiobookProjectsWithContent(projects: BookProject[]): BookProject[] {
  return projects.filter((project) => splitBookIntoAudioChapters(project).length > 0);
}

export function manifestToJson(manifest: AudiobookManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function scriptFilename(project: BookProject, ext: "txt" | "json"): string {
  const base = (project.config.title || "audiolibro")
    .replace(/[^a-zA-Z0-9\sàèéìòù]/gi, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "audiolibro";
  return `${base}_audiolibro.${ext}`;
}

export async function downloadAudiobookManifest(project: BookProject): Promise<void> {
  return downloadAudiobookScript(project, "json");
}

export async function downloadAudiobookScript(
  project: BookProject,
  format: "txt" | "json",
): Promise<void> {
  const script = buildAudiobookScript(project);
  const filename = scriptFilename(project, format);
  const blob = format === "json"
    ? new Blob([manifestToJson(script.manifest)], { type: "application/json" })
    : new Blob([script.plainText], { type: "text/plain;charset=utf-8" });

  await saveBlobAs(blob, {
    suggestedName: filename.replace(/\.(txt|json)$/, ""),
    mimeType: format === "json" ? "application/json" : "text/plain",
    extension: format,
    description: format === "json" ? "Manifest audiolibro" : "Copione audiolibro",
  });
}
