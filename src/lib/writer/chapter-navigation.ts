import type { SectionId } from "@/types/book";

export function getChapterIndexFromSection(section: SectionId | null | undefined): number | null {
  if (!section) return null;
  const match = String(section).match(/^chapter-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function chapterAnchorId(chapterIndex: number): string {
  return `scriptora-chapter-${chapterIndex}`;
}

/** Scroll to the active chapter editor with header offset (CSS scroll-margin-top). */
export function scrollToChapterAnchor(
  chapterIndex: number,
  options?: { behavior?: ScrollBehavior; resetWindow?: boolean },
): void {
  const behavior = options?.behavior ?? "smooth";

  if (options?.resetWindow !== false && typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior });
  }

  requestAnimationFrame(() => {
    const el = document.getElementById(chapterAnchorId(chapterIndex));
    el?.scrollIntoView({ behavior, block: "start" });
  });
}
