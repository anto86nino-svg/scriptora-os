import type { AuthorIdentity, BookConfig } from "@/types/book";
import { isUserAuthorIdentityConfigured } from "@/lib/author-identity";
import { BookConfigStudioError, type BookConfigStudioIssue } from "./types";
import { normalizeBookConfig } from "./defaults";

export function validateBookConfigStudio(
  config: Partial<BookConfig>,
  authorIdentity?: AuthorIdentity | null,
): BookConfigStudioIssue[] {
  const normalized = normalizeBookConfig(config as BookConfig);
  const issues: BookConfigStudioIssue[] = [];

  if (!String(normalized.title || "").trim() || normalized.title === "Romanzo senza titolo") {
    issues.push({ id: "title", step: 1, message: "Titolo libro obbligatorio." });
  }

  if (!normalized.language) {
    issues.push({ id: "language", step: 1, message: "Lingua di scrittura obbligatoria." });
  }

  if (!normalized.genre) {
    issues.push({ id: "genre", step: 1, message: "Genere obbligatorio." });
  }

  if (!String(normalized.category || "").trim()) {
    issues.push({ id: "category", step: 1, message: "Categoria Amazon obbligatoria." });
  }

  const authorName = String(
    normalized.authorName || normalized.author || normalized.writerName || authorIdentity?.penName || "",
  ).trim();
  if (!authorName) {
    issues.push({ id: "author", step: 1, message: "Nome autore obbligatorio." });
  }

  const identity = authorIdentity || normalized.authorIdentity || null;
  const identityBasicsOk = Boolean(
    String(identity?.penName || normalized.authorName || "").trim().length >= 2
    && String(identity?.biography || "").trim().length >= 12
    && String(identity?.voice || "").trim().length >= 8,
  );
  if (!identityBasicsOk && !isUserAuthorIdentityConfigured(identity)) {
    issues.push({
      id: "identity",
      step: 2,
      message: "Identità autore incompleta — pen name, bio e voce narrativa richiesti.",
    });
  }

  if (normalized.numberOfChapters < 1) {
    issues.push({ id: "chapters", step: 3, message: "Numero capitoli non valido." });
  }

  if (normalized.subchaptersEnabled && (normalized.subchaptersPerChapter || 0) < 1) {
    issues.push({ id: "subchapters", step: 3, message: "Con sottocapitoli attivi, imposta almeno 1 per capitolo." });
  }

  if (!String(normalized.tone || "").trim()) {
    issues.push({ id: "tone", step: 5, message: "Tono editoriale obbligatorio." });
  }

  return issues;
}

export function assertBookConfigStudioReady(
  config: Partial<BookConfig>,
  authorIdentity?: AuthorIdentity | null,
): BookConfig {
  const issues = validateBookConfigStudio(config, authorIdentity);
  if (issues.length) throw new BookConfigStudioError(issues);
  const ready = normalizeBookConfig(config as BookConfig);
  return { ...ready, configStatus: "validated" };
}
