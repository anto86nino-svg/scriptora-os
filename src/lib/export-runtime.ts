import type { BookProject } from "@/types/book";

export async function runEpubExport(project: BookProject, coverDataUrl?: string): Promise<Blob> {
  const { generateEpub } = await import("@/lib/epub");
  return generateEpub(project, coverDataUrl);
}

export async function downloadEpubFile(blob: Blob, filename: string): Promise<void> {
  const { downloadEpub } = await import("@/lib/epub");
  downloadEpub(blob, filename);
}

export async function validateEpubExport(project: BookProject): Promise<string[]> {
  const { validateEpubStructure } = await import("@/lib/epub");
  return validateEpubStructure(project);
}

export async function runDocxExport(project: BookProject): Promise<Blob> {
  const { generateDocx } = await import("@/lib/docx-export");
  return generateDocx(project);
}

export async function downloadDocxFile(blob: Blob, filename: string): Promise<void> {
  const { downloadDocx } = await import("@/lib/docx-export");
  downloadDocx(blob, filename);
}

export async function runPdfExport(project: BookProject): Promise<Blob> {
  const { generatePdf } = await import("@/lib/pdf-export");
  return generatePdf(project);
}

export async function downloadPdfFile(blob: Blob, filename: string): Promise<void> {
  const { downloadPdf } = await import("@/lib/pdf-export");
  downloadPdf(blob, filename);
}
