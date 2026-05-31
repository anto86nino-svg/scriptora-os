/** PDF trim sizes in points (72 pt = 1 inch). */
export type PdfExportPreset = "kdp-6x9" | "kdp-5x8" | "digital" | "review";

export type DocxExportPreset = "editorial" | "publisher" | "kdp";

export interface PdfLayoutPreset {
  id: PdfExportPreset;
  label: string;
  description: string;
  pageW: number;
  pageH: number;
  marginTop: number;
  marginBottom: number;
  marginInner: number;
  marginOuter: number;
  bodySize: number;
  lineHeight: number;
  headingSize: number;
  useRunningHeads: boolean;
  useDropCap: boolean;
  useOrnament: boolean;
}

export interface DocxLayoutPreset {
  id: DocxExportPreset;
  label: string;
  description: string;
  font: string;
  bodySize: number;
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  useDropCap: boolean;
  useOrnament: boolean;
}

export const PDF_EXPORT_PRESETS: Record<PdfExportPreset, PdfLayoutPreset> = {
  "kdp-6x9": {
    id: "kdp-6x9",
    label: "KDP Paperback 6×9",
    description: "Standard print trim for Amazon KDP paperback.",
    pageW: 432,
    pageH: 648,
    marginTop: 72,
    marginBottom: 72,
    marginInner: 79.2,
    marginOuter: 54,
    bodySize: 10.5,
    lineHeight: 14.5,
    headingSize: 18,
    useRunningHeads: true,
    useDropCap: true,
    useOrnament: true,
  },
  "kdp-5x8": {
    id: "kdp-5x8",
    label: "KDP Paperback 5×8",
    description: "Compact trim for shorter fiction and memoir.",
    pageW: 360,
    pageH: 576,
    marginTop: 63,
    marginBottom: 63,
    marginInner: 72,
    marginOuter: 54,
    bodySize: 10,
    lineHeight: 14,
    headingSize: 16,
    useRunningHeads: true,
    useDropCap: true,
    useOrnament: true,
  },
  digital: {
    id: "digital",
    label: "Digital PDF",
    description: "Screen reading — comfortable margins and type.",
    pageW: 612,
    pageH: 792,
    marginTop: 72,
    marginBottom: 72,
    marginInner: 72,
    marginOuter: 72,
    bodySize: 11,
    lineHeight: 15,
    headingSize: 20,
    useRunningHeads: false,
    useDropCap: false,
    useOrnament: false,
  },
  review: {
    id: "review",
    label: "Manuscript Review Copy",
    description: "Wide margins for editorial notes and agency review.",
    pageW: 612,
    pageH: 792,
    marginTop: 90,
    marginBottom: 90,
    marginInner: 108,
    marginOuter: 90,
    bodySize: 12,
    lineHeight: 18,
    headingSize: 18,
    useRunningHeads: true,
    useDropCap: false,
    useOrnament: false,
  },
};

export const DOCX_EXPORT_PRESETS: Record<DocxExportPreset, DocxLayoutPreset> = {
  editorial: {
    id: "editorial",
    label: "Editorial Manuscript",
    description: "Classic Garamond layout for editors and beta readers.",
    font: "Garamond",
    bodySize: 22,
    pageWidth: 8640,
    pageHeight: 12960,
    marginTop: 1080,
    marginBottom: 1080,
    marginLeft: 1260,
    marginRight: 900,
    useDropCap: true,
    useOrnament: true,
  },
  publisher: {
    id: "publisher",
    label: "Clean Publisher Draft",
    description: "Minimal ornamentation — agency-ready structure.",
    font: "Times New Roman",
    bodySize: 24,
    pageWidth: 12240,
    pageHeight: 15840,
    marginTop: 1440,
    marginBottom: 1440,
    marginLeft: 1440,
    marginRight: 1440,
    useDropCap: false,
    useOrnament: false,
  },
  kdp: {
    id: "kdp",
    label: "KDP Upload Draft",
    description: "6×9 Word draft aligned with KDP interior expectations.",
    font: "Garamond",
    bodySize: 22,
    pageWidth: 8640,
    pageHeight: 12960,
    marginTop: 1080,
    marginBottom: 1080,
    marginLeft: 1260,
    marginRight: 900,
    useDropCap: false,
    useOrnament: true,
  },
};

export function defaultPdfPreset(): PdfExportPreset {
  return "kdp-6x9";
}

export function defaultDocxPreset(): DocxExportPreset {
  return "editorial";
}

export function recommendedPdfPreset(format: "print" | "digital" | "review"): PdfExportPreset {
  if (format === "digital") return "digital";
  if (format === "review") return "review";
  return "kdp-6x9";
}
