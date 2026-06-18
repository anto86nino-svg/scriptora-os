import type { GenerationStatus } from "@/types/book";

export function countWords(text: string): number {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function hasRecoverableContent(content: unknown): boolean {
  return classifyPartialSuccess(String(content || "")).status !== "failed_empty";
}

export function classifyPartialSuccess(content: string): {
  status: GenerationStatus;
  title: string;
  body: string;
} {
  const words = countWords(content);
  if (words >= 120) {
    return {
      status: "completed_with_warning",
      title: "Contenuto recuperato",
      body: "Contenuto recuperato. Alcune parti richiedono completamento.",
    };
  }
  if (words >= 35) {
    return {
      status: "recovered_partial",
      title: "Contenuto parziale recuperato",
      body: "Contenuto recuperato. Alcune parti richiedono completamento.",
    };
  }
  return {
    status: "failed_empty",
    title: "Generazione incompleta",
    body: "Non è stato possibile recuperare contenuto sufficiente.",
  };
}

export function partialSuccessMessage(content: string): string {
  const { body } = classifyPartialSuccess(content);
  return body;
}

export function shouldShowContinueChapter(content: string): boolean {
  const words = countWords(content);
  return words >= 35 && words < 120;
}
