import type { BookProject, Language } from "@/types/book";
import { isGenericChapterTitle } from "@/lib/chapter-titles";

const VALID_LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];

const TECHNICAL_LEAK_RE =
  /\b(to be generated|chapter setup|genre coach|assistant|debug|placeholder|lorem ipsum|todo:?|tbd|n\/a)\b/i;

export interface GenerationReadinessIssue {
  id: string;
  message: string;
}

export class ProjectGenerationBlockedError extends Error {
  readonly issues: GenerationReadinessIssue[];
  readonly focusSection: "blueprint";

  constructor(issues: GenerationReadinessIssue[]) {
    const summary = issues.map((issue) => issue.message).join(" · ");
    super(summary);
    this.name = "ProjectGenerationBlockedError";
    this.issues = issues;
    this.focusSection = "blueprint";
  }
}

export function isForbiddenChapterSummary(value: unknown): boolean {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return true;
  if (text.length < 12) return true;
  if (TECHNICAL_LEAK_RE.test(text)) return true;
  if (/^develop chapter \d+/i.test(text)) return true;
  return false;
}

export function sanitizeEditorialSummary(
  summary: unknown,
  chapterIndex: number,
  language?: string,
): string {
  const clean = String(summary || "").replace(/\s+/g, " ").trim();
  if (!isForbiddenChapterSummary(clean)) return clean;
  const lang = language || "Italian";
  if (lang === "English") {
    return `Chapter ${chapterIndex + 1} advances the story with tone and continuity aligned to the book blueprint.`;
  }
  return `Il capitolo ${chapterIndex + 1} sviluppa la trama con tono e continuità coerenti con il blueprint del libro.`;
}

export function buildEditorialChapterPreview(
  summary: unknown,
  chapterIndex: number,
  language?: string,
): string {
  const sanitized = sanitizeEditorialSummary(summary, chapterIndex, language);
  const first = sanitized.split(/[.!?]/)[0]?.trim() || sanitized;
  if (first.length <= 220) return first;
  return `${first.slice(0, 217).replace(/\s+\S*$/, "").trim()}...`;
}

function isInvalidTitle(value: unknown): boolean {
  const title = String(value || "").trim();
  return !title || title === "Senza titolo" || title === "Untitled";
}

function isBlueprintWeak(project: BookProject): boolean {
  const outlines = project.blueprint?.chapterOutlines;
  if (!outlines?.length) return true;
  const weak = outlines.filter((outline) => isForbiddenChapterSummary(outline?.summary));
  return weak.length > Math.max(1, Math.floor(outlines.length * 0.5));
}

export function validateProjectGenerationReadiness(
  project: BookProject | null | undefined,
  chapterIndex?: number,
): GenerationReadinessIssue[] {
  const issues: GenerationReadinessIssue[] = [];
  if (!project) {
    issues.push({ id: "project", message: "Nessun progetto attivo." });
    return issues;
  }

  const config = project.config;
  if (isInvalidTitle(config?.title)) {
    issues.push({ id: "title", message: "Titolo del libro mancante — completa la configurazione." });
  }

  const language = String(config?.language || "").trim();
  if (!language || !VALID_LANGUAGES.includes(language as Language)) {
    issues.push({ id: "language", message: "Lingua di scrittura non impostata — scegli Italiano, English o altra lingua supportata." });
  }

  const genre = String(config?.genre || "").trim();
  if (!genre) {
    issues.push({ id: "genre", message: "Genere non riconosciuto — seleziona un genere prima di generare." });
  }

  const chapters = Math.max(0, Number(config?.numberOfChapters || 0));
  if (chapters < 1) {
    issues.push({ id: "chapters", message: "Numero capitoli non valido — imposta almeno 1 capitolo." });
  }

  if (project.blueprintApproved === false && project.blueprint) {
    issues.push({
      id: "blueprint-approval",
      message: "Blueprint non ancora approvato — rivedi la struttura e conferma prima di generare.",
    });
  }

  if (!project.blueprint?.chapterOutlines?.length) {
    issues.push({ id: "blueprint", message: "Blueprint mancante — apri Struttura e genera il blueprint." });
  } else if (project.blueprintStatus === "error") {
    issues.push({ id: "blueprint-error", message: "Blueprint non valido — usa Rigenera Blueprint o Crea struttura base sicura." });
  } else if (isBlueprintWeak(project)) {
    issues.push({ id: "blueprint-quality", message: "Blueprint incompleto — rigenera la struttura prima di scrivere i capitoli." });
  } else if (project.blueprint.chapterOutlines.length < chapters) {
    issues.push({
      id: "blueprint-count",
      message: `Blueprint con ${project.blueprint.chapterOutlines.length} capitoli su ${chapters} richiesti — rigenera la struttura.`,
    });
  }

  if (chapterIndex != null && chapterIndex >= 0) {
    const outline = project.blueprint?.chapterOutlines?.[chapterIndex];
    if (!outline) {
      issues.push({
        id: "chapter-outline",
        message: `Capitolo ${chapterIndex + 1} assente nel blueprint — rigenera la struttura.`,
      });
    } else if (isForbiddenChapterSummary(outline.summary)) {
      issues.push({
        id: "chapter-summary",
        message: `Capitolo ${chapterIndex + 1} senza trama valida — rigenera il blueprint o modifica la struttura.`,
      });
    } else if (isGenericChapterTitle(outline.title)) {
      issues.push({
        id: "chapter-title",
        message: `Capitolo ${chapterIndex + 1} con titolo provvisorio — rigenera il blueprint per titoli editoriali.`,
      });
    }
  }

  return issues;
}

export function assertProjectReadyForGeneration(
  project: BookProject | null | undefined,
  chapterIndex?: number,
): void {
  const issues = validateProjectGenerationReadiness(project, chapterIndex);
  if (issues.length) throw new ProjectGenerationBlockedError(issues);
}
