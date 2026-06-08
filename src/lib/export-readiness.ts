import type { BookProject, SectionId } from "@/types/book";
import { getSubchaptersPerChapter } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";

export type ExportFixAction =
  | { type: "open_section"; section: SectionId }
  | { type: "open_cover" }
  | { type: "generate_blueprint" }
  | { type: "generate_chapter"; chapterIndex: number }
  | { type: "generate_subchapter"; chapterIndex: number; subIndex: number }
  | { type: "generate_front_matter" }
  | { type: "generate_back_matter" };

export type ExportIssue = {
  id: string;
  severity: "blocker" | "warning";
  title: string;
  description: string;
  cause: string;
  fix: ExportFixAction;
  fixLabel: string;
};

export type ExportReadinessResult = {
  canExport: boolean;
  blockers: ExportIssue[];
  warnings: ExportIssue[];
  issues: ExportIssue[];
};

function chapterHasContent(content?: string): boolean {
  return (content || "").trim().length > 50;
}

export function analyzeExportReadiness(
  project: BookProject | null | undefined,
  opts?: { hasCover?: boolean },
): ExportReadinessResult {
  const issues: ExportIssue[] = [];
  if (!project) {
    issues.push({
      id: "no-project",
      severity: "blocker",
      title: "Nessun progetto",
      description: "Apri un libro prima di esportare.",
      cause: "Nessun progetto attivo nel writer.",
      fix: { type: "open_section", section: "blueprint" },
      fixLabel: "Apri progetto",
    });
    return pack(issues);
  }

  const { config, blueprint, chapters, frontMatter, backMatter } = project;
  const total = Math.max(0, config?.numberOfChapters || 0);
  const subTarget = getSubchaptersPerChapter(config);

  if (!blueprint) {
    issues.push({
      id: "missing-blueprint",
      severity: "blocker",
      title: "Blueprint mancante",
      description: "Genera prima la struttura del libro.",
      cause: "Il blueprint definisce capitoli, obiettivi e indice.",
      fix: { type: "generate_blueprint" },
      fixLabel: "Apri Blueprint",
    });
  }

  for (let i = 0; i < total; i += 1) {
    const chapter = chapters?.[i];
    const outline = blueprint?.chapterOutlines?.[i];
    if (!chapterHasContent(chapter?.content)) {
      issues.push({
        id: `missing-chapter-${i}`,
        severity: "blocker",
        title: `Capitolo ${i + 1} incompleto`,
        description: outline?.title
          ? `"${outline.title}" non ha ancora testo sufficiente.`
          : `Il capitolo ${i + 1} non è stato generato.`,
        cause: "L'export richiede contenuto reale in ogni capitolo previsto.",
        fix: { type: "generate_chapter", chapterIndex: i },
        fixLabel: "Genera capitolo",
      });
    }

    if (subTarget > 0 && chapterHasContent(chapter?.content)) {
      for (let subIndex = 0; subIndex < subTarget; subIndex += 1) {
        const sub = chapter?.subchapters?.[subIndex];
        if (!chapterHasContent(sub?.content)) {
          const subTitle = outline?.subchapters?.[subIndex]?.title || `Sottocapitolo ${subIndex + 1}`;
          issues.push({
            id: `missing-sub-${i}-${subIndex}`,
            severity: "blocker",
            title: `Sottocapitolo ${i + 1}.${subIndex + 1} mancante`,
            description: `"${subTitle}" è attivo nel progetto ma non ha contenuto.`,
            cause: "Hai attivato i sottocapitoli nel progetto.",
            fix: { type: "generate_subchapter", chapterIndex: i, subIndex },
            fixLabel: "Genera sottocapitolo",
          });
        }
      }
    }
  }

  if (!frontMatter) {
    issues.push({
      id: "missing-front-matter",
      severity: "warning",
      title: "Front matter assente",
      description: "Copyright, dedica e lettera al lettore non sono ancora generati.",
      cause: "Consigliato per un export professionale, ma non obbligatorio.",
      fix: { type: "generate_front_matter" },
      fixLabel: "Genera premessa",
    });
  }

  if (!backMatter && isProjectComplete(project)) {
    issues.push({
      id: "missing-back-matter",
      severity: "warning",
      title: "Back matter assente",
      description: "Conclusione e note finali non sono ancora generate.",
      cause: "Consigliato per un export completo, ma non blocca DOCX/PDF.",
      fix: { type: "generate_back_matter" },
      fixLabel: "Genera postfazione",
    });
  }

  if (!opts?.hasCover) {
    issues.push({
      id: "missing-cover",
      severity: "warning",
      title: "Copertina non impostata",
      description: "Puoi esportare senza cover o crearne una ora.",
      cause: "La cover è opzionale per EPUB in Scriptora.",
      fix: { type: "open_cover" },
      fixLabel: "Apri Cover Studio",
    });
  }

  return pack(issues);
}

function pack(issues: ExportIssue[]): ExportReadinessResult {
  const blockers = issues.filter((i) => i.severity === "blocker");
  const warnings = issues.filter((i) => i.severity === "warning");
  return {
    canExport: blockers.length === 0,
    blockers,
    warnings,
    issues,
  };
}

export function getExportBlockerMessages(result: ExportReadinessResult): string[] {
  return result.blockers.map((issue) => `${issue.title}: ${issue.description}`);
}
