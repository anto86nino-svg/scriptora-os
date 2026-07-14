import { resolveAuthorIdentityForPublishing } from "@/lib/author-identity";

type ExportAuthorConfig = {
  authorName?: unknown;
  author?: unknown;
  writerName?: unknown;
  copyrightName?: unknown;
};

const PLACEHOLDER_AUTHORS = new Set([
  "",
  "autore",
  "author",
  "untitled author",
  "scriptora studio",
  "antonino campanella",
]);

export function isPlaceholderExportAuthor(name: string): boolean {
  return PLACEHOLDER_AUTHORS.has(name.trim().toLowerCase());
}

/** Resolves a publishable author name from project config + saved identity. Never invents a fallback. */
export function resolveExportAuthorName(config: ExportAuthorConfig = {}): string | null {
  const candidates = [
    config.authorName,
    config.author,
    config.writerName,
    config.copyrightName,
  ];

  for (const candidate of candidates) {
    const name = String(candidate || "").trim();
    if (name && !isPlaceholderExportAuthor(name)) return name;
  }

  const identity = resolveAuthorIdentityForPublishing();
  const penName = String(identity?.penName || "").trim();
  if (penName && !isPlaceholderExportAuthor(penName)) return penName;

  return null;
}
