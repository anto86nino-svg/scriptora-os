export type ManuscriptCandidateValidation = {
  valid: boolean;
  reason?: string;
  wordCount: number;
};

export type SafeManuscriptCleanupResult = {
  content: string;
  status: "completed" | "completed_with_warning" | "failed";
  cleanupApplied: boolean;
  warning?: string;
  blockingError?: string;
};

export type ManuscriptValidationOptions = {
  minWords?: number;
  expectedSubchapters?: number;
  writtenSubchapters?: number;
  label?: string;
};

export function countManuscriptWords(text: string): number {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function isMarkdownOnly(text: string): boolean {
  const cleaned = String(text || "")
    .replace(/^#{1,6}\s*.+$/gm, "")
    .replace(/[*_`>\-\s]/g, "")
    .trim();
  return cleaned.length === 0;
}

export function validateManuscriptCandidate(
  text: string,
  options: ManuscriptValidationOptions = {},
): ManuscriptCandidateValidation {
  const content = String(text || "").trim();
  const wordCount = countManuscriptWords(content);
  const minWords = Math.max(1, options.minWords ?? 300);

  if (!content) return { valid: false, reason: "output vuoto", wordCount };

  const expectedSubchapters = Math.max(0, Number(options.expectedSubchapters || 0));
  const writtenSubchapters = Math.max(0, Number(options.writtenSubchapters || 0));
  if (expectedSubchapters > 0 && writtenSubchapters >= expectedSubchapters) {
    return { valid: true, wordCount };
  }

  if (isMarkdownOnly(content)) return { valid: false, reason: "output solo markdown", wordCount };
  if (wordCount <= 3) return { valid: false, reason: "output solo titolo", wordCount };

  if (wordCount < minWords) {
    return {
      valid: false,
      reason: `testo sotto soglia (${wordCount}/${minWords} parole)`,
      wordCount,
    };
  }

  return { valid: true, wordCount };
}

export function applySafeManuscriptCleanup(
  originalText: string,
  cleanup: (text: string) => string,
  options: ManuscriptValidationOptions = {},
): SafeManuscriptCleanupResult {
  const label = options.label || "Output";
  const originalValidation = validateManuscriptCandidate(originalText, options);

  let cleanedText = "";
  let cleanupError = "";
  try {
    cleanedText = cleanup(originalText);
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error || "");
  }

  if (!cleanupError) {
    const cleanedValidation = validateManuscriptCandidate(cleanedText, options);
    if (cleanedValidation.valid) {
      return {
        content: cleanedText.trim(),
        status: "completed",
        cleanupApplied: true,
      };
    }

    if (originalValidation.valid) {
      return {
        content: String(originalText || "").trim(),
        status: "completed_with_warning",
        cleanupApplied: false,
        warning: `${label}: cleanup non applicato perche' avrebbe prodotto ${cleanedValidation.reason || "output non valido"}.`,
      };
    }

    return {
      content: cleanedText.trim(),
      status: "failed",
      cleanupApplied: false,
      blockingError: `${label}: output finale non valido dopo la pulizia del manoscritto (${cleanedValidation.reason || "invalid"}).`,
    };
  }

  if (originalValidation.valid) {
    return {
      content: String(originalText || "").trim(),
      status: "completed_with_warning",
      cleanupApplied: false,
      warning: `${label}: cleanup non applicato (${cleanupError}).`,
    };
  }

  return {
    content: String(originalText || "").trim(),
    status: "failed",
    cleanupApplied: false,
    blockingError: `${label}: output finale non valido dopo la pulizia del manoscritto (${cleanupError || originalValidation.reason || "invalid"}).`,
  };
}
