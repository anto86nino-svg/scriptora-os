import type { BookProject } from "@/types/book";
import { getBookTotalWords } from "@/types/book";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";

export function areChaptersComplete(project: BookProject): boolean {
  const target = project.config?.numberOfChapters || 0;
  if (!target) return false;
  const done = (project.chapters || []).filter((c) => (c.content || "").trim().length > 50).length;
  return done >= target;
}

export function countSectionProgress(project: BookProject): { complete: number; total: number } {
  const { config, blueprint, chapters, frontMatter, backMatter } = project;
  const totalChapters = config.numberOfChapters || 0;
  let total = 1;
  let complete = blueprint ? 1 : 0;

  if (isFrontMatterEnabled(config)) {
    total += 1;
    if (frontMatter) complete += 1;
  }

  total += totalChapters;
  complete += (chapters || []).filter((c) => (c.content || "").trim().length > 50).length;

  if (isBackMatterEnabled(config)) {
    total += 1;
    if (backMatter) complete += 1;
  }

  return { complete, total };
}

export function computeProjectProgressPercent(project: BookProject): number {
  const { complete, total } = countSectionProgress(project);
  if (!total) return 0;
  return Math.min(100, Math.round((complete / total) * 100));
}

export function countProjectWords(project: BookProject): number {
  const { config, chapters, frontMatter, backMatter } = project;
  let totalWords = 0;

  if (isFrontMatterEnabled(config) && frontMatter) {
    totalWords += Object.values(frontMatter).join(" ").split(/\s+/).filter(Boolean).length;
  }

  (chapters || []).forEach((ch) => {
    if (ch.content) totalWords += ch.content.split(/\s+/).filter(Boolean).length;
    (ch.subchapters || []).forEach((sub) => {
      if (sub.content) totalWords += sub.content.split(/\s+/).filter(Boolean).length;
    });
  });

  if (isBackMatterEnabled(config) && backMatter) {
    totalWords += Object.values(backMatter).join(" ").split(/\s+/).filter(Boolean).length;
  }

  return totalWords;
}

export function computeWordProgressPercent(project: BookProject): number {
  const totalTargetWords = getBookTotalWords(project.config);
  if (!totalTargetWords) return 0;
  return Math.min(100, Math.round((countProjectWords(project) / totalTargetWords) * 100));
}
