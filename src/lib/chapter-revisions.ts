export interface ChapterRevision {
  id: string;
  projectId: string;
  chapterIndex: number;
  before: string;
  after: string;
  reason: string;
  impact?: string;
  createdAt: string;
}

const STORAGE_KEY = "scriptora-chapter-revisions-v1";
const MAX_PER_CHAPTER = 12;

function readAll(): ChapterRevision[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: ChapterRevision[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 80)));
}

export function pushChapterRevision(input: Omit<ChapterRevision, "id" | "createdAt">): ChapterRevision {
  const record: ChapterRevision = {
    ...input,
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  const sameChapter = all.filter(
    (item) => item.projectId === input.projectId && item.chapterIndex === input.chapterIndex,
  );
  const others = all.filter(
    (item) => item.projectId !== input.projectId || item.chapterIndex !== input.chapterIndex,
  );
  writeAll([record, ...sameChapter.slice(0, MAX_PER_CHAPTER - 1), ...others].slice(0, 80));
  return record;
}

export function peekChapterRevision(projectId: string, chapterIndex: number): ChapterRevision | null {
  return (
    readAll().find((item) => item.projectId === projectId && item.chapterIndex === chapterIndex) || null
  );
}

export function popChapterRevision(projectId: string, chapterIndex: number): ChapterRevision | null {
  const all = readAll();
  const latest = all.find((item) => item.projectId === projectId && item.chapterIndex === chapterIndex);
  if (!latest) return null;
  writeAll(all.filter((item) => item.id !== latest.id));
  return latest;
}

export function listChapterRevisions(projectId: string, chapterIndex: number): ChapterRevision[] {
  return readAll().filter((item) => item.projectId === projectId && item.chapterIndex === chapterIndex);
}
