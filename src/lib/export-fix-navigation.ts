import type { SectionId } from "@/types/book";
import type { ExportFixAction } from "@/lib/export-readiness";

const AUTO_FIX_KEY = "nexora-auto-export-fix";
const OPEN_PROJECT_KEY = "nexora-open-project";
const OPEN_SECTION_KEY = "nexora-open-section";

export function sectionForExportFix(fix: ExportFixAction): SectionId {
  switch (fix.type) {
    case "open_section":
      return fix.section;
    case "generate_blueprint":
      return "blueprint";
    case "generate_front_matter":
      return "front-matter";
    case "generate_back_matter":
      return "back-matter";
    case "generate_chapter":
      return `chapter-${fix.chapterIndex}` as SectionId;
    case "generate_subchapter":
      return `chapter-${fix.chapterIndex}-sub-${fix.subIndex}` as SectionId;
    case "open_cover":
      return "blueprint";
    default:
      return "blueprint";
  }
}

export function shouldAutoRunExportFix(fix: ExportFixAction): boolean {
  return (
    fix.type === "generate_chapter" ||
    fix.type === "generate_subchapter" ||
    fix.type === "generate_front_matter" ||
    fix.type === "generate_back_matter"
  );
}

export function queueExportFixNavigation(projectId: string, fix: ExportFixAction): void {
  sessionStorage.setItem(OPEN_PROJECT_KEY, projectId);
  sessionStorage.setItem(OPEN_SECTION_KEY, sectionForExportFix(fix));
  if (shouldAutoRunExportFix(fix)) {
    sessionStorage.setItem(AUTO_FIX_KEY, JSON.stringify(fix));
  }
}

export function consumeQueuedExportFix(): ExportFixAction | null {
  const raw = sessionStorage.getItem(AUTO_FIX_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(AUTO_FIX_KEY);
  try {
    return JSON.parse(raw) as ExportFixAction;
  } catch {
    return null;
  }
}
