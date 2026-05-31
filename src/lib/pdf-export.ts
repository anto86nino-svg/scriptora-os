import { prepareExportProject } from "@/lib/export-quality-engine";
import { prepareExportProject } from "@/lib/export-quality-engine";
import { exportLabel, cleanExportText, parseExportBlocks, cleanMarkdownInline } from "@/lib/export-cleanup";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import { PDF_EXPORT_PRESETS, defaultPdfPreset, type PdfExportPreset, type PdfLayoutPreset } from "@/lib/export-presets";
import jsPDF from "jspdf";
import { BookProject } from "@/types/book";

export interface PdfExportOptions {
  preset?: PdfExportPreset;
}

function safeText(text: unknown): string {
  if (!text) return "";
  if (typeof text === "string") return text;
  if (typeof text === "object") return JSON.stringify(text);
  return String(text);
}

function cleanMarkdown(text: string): string {
  return cleanMarkdownInline(text);
}

interface PdfState {
  layout: PdfLayoutPreset;
  doc: jsPDF;
  y: number;
  pageNum: number;
  bookTitle: string;
  authorName: string;
  currentChapterTitle: string;
  inFrontMatter: boolean;
  romanNumeral: number;
  suppressRunningHead: boolean;
}

function contentWidth(layout: PdfLayoutPreset): number {
  return layout.pageW - layout.marginInner - layout.marginOuter;
}

function getMarginLeft(state: PdfState): number {
  return state.pageNum % 2 === 1 ? state.layout.marginInner : state.layout.marginOuter;
}

function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
    [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
    [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let result = "";
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

function addRunningHeadAndPageNum(state: PdfState) {
  if (state.suppressRunningHead || !state.layout.useRunningHeads) return;
  const { doc, pageNum, layout } = state;
  const isOdd = pageNum % 2 === 1;
  const ml = getMarginLeft(state);
  const cw = contentWidth(layout);

  doc.setFontSize(8.5);
  doc.setFont("times", "italic");
  doc.setTextColor(80, 80, 80);
  const headText = isOdd
    ? cleanExportText(state.currentChapterTitle || state.bookTitle).toUpperCase()
    : state.authorName.toUpperCase();
  doc.text(headText, isOdd ? ml + cw : ml, layout.marginTop - 28, {
    align: isOdd ? "right" : "left",
    maxWidth: cw,
  });

  doc.setFontSize(9);
  doc.setFont("times", "normal");
  doc.setTextColor(40, 40, 40);
  const pageLabel = state.inFrontMatter ? toRoman(state.romanNumeral) : String(pageNum);
  doc.text(pageLabel, isOdd ? ml + cw : ml, layout.pageH - 36, {
    align: isOdd ? "right" : "left",
  });
  doc.setTextColor(0, 0, 0);
}

function newPage(state: PdfState) {
  addRunningHeadAndPageNum(state);
  state.doc.addPage([state.layout.pageW, state.layout.pageH]);
  state.pageNum++;
  if (state.inFrontMatter) state.romanNumeral++;
  state.y = state.layout.marginTop;
  state.suppressRunningHead = false;
}

function ensureSpace(state: PdfState, needed: number) {
  if (state.y + needed > state.layout.pageH - state.layout.marginBottom - 20) {
    newPage(state);
  }
}

function ensureRectoPage(state: PdfState) {
  if (state.pageNum % 2 === 0) {
    state.suppressRunningHead = true;
    newPage(state);
  } else {
    newPage(state);
  }
}

function writeCenteredTitle(state: PdfState, text: string, size: number, italic: boolean = false) {
  ensureSpace(state, size * 2);
  state.doc.setFontSize(size);
  state.doc.setFont("times", italic ? "italic" : "bold");
  const ml = getMarginLeft(state);
  const cw = contentWidth(state.layout);
  const lines = state.doc.splitTextToSize(cleanMarkdown(text), cw);
  for (const line of lines) {
    state.doc.text(line, ml + cw / 2, state.y, { align: "center" });
    state.y += size * 1.3;
  }
}

function writeSectionTitle(state: PdfState, text: string, size: number = 13) {
  ensureSpace(state, size * 2.5);
  state.y += size * 0.8;
  state.doc.setFontSize(size);
  state.doc.setFont("times", "bold");
  const ml = getMarginLeft(state);
  state.doc.text(cleanMarkdown(text), ml, state.y, { maxWidth: contentWidth(state.layout) });
  state.y += size * 1.6;
}

function writePlainLines(state: PdfState, text: string, opts?: { indent?: number; boldPrefix?: string }) {
  const layout = state.layout;
  const ml = getMarginLeft(state);
  const indent = opts?.indent || 0;
  const prefix = opts?.boldPrefix || "";
  const full = `${prefix}${text}`;
  const lines = state.doc.splitTextToSize(full, contentWidth(layout) - indent);
  state.doc.setFontSize(layout.bodySize);
  state.doc.setFont("times", "normal");
  for (let li = 0; li < lines.length; li++) {
    ensureSpace(state, layout.lineHeight);
    state.doc.text(lines[li], ml + indent, state.y, { maxWidth: contentWidth(layout) - indent });
    state.y += layout.lineHeight;
  }
  state.y += 3;
}

function writeParagraphsWithDropCap(state: PdfState, text: string, useDropCap: boolean) {
  const layout = state.layout;
  const blocks = parseExportBlocks(safeText(text));
  if (blocks.length === 0) return;

  let firstTextParagraph = true;
  state.doc.setFontSize(layout.bodySize);
  state.doc.setFont("times", "normal");

  for (const block of blocks) {
    if (block.type === "heading2") {
      writeSectionTitle(state, block.text, 13.5);
      firstTextParagraph = true;
      continue;
    }

    if (block.type === "heading3") {
      writeSectionTitle(state, block.text, 12);
      firstTextParagraph = true;
      continue;
    }

    if (block.type === "scene") {
      const ml = getMarginLeft(state);
      state.y += layout.lineHeight * 0.5;
      state.doc.setFontSize(layout.bodySize);
      state.doc.text("✦  ✦  ✦", ml + contentWidth(layout) / 2, state.y, { align: "center" });
      state.y += layout.lineHeight * 1.5;
      firstTextParagraph = true;
      continue;
    }

    if (block.type === "bullet" || block.type === "numbered") {
      block.items.forEach((item, idx) => {
        const prefix = block.type === "bullet" ? "• " : `${idx + 1}. `;
        writePlainLines(state, item, { indent: 14, boldPrefix: prefix });
      });
      firstTextParagraph = false;
      continue;
    }

    const para = cleanMarkdown(block.text);
    if (!para) continue;
    const ml = getMarginLeft(state);
    const cw = contentWidth(layout);

    if (layout.useDropCap && useDropCap && firstTextParagraph && para.length > 5) {
      const firstChar = para.charAt(0);
      const restOfPara = para.slice(1);
      const dropSize = layout.bodySize * 3.4;
      const dropHeight = dropSize * 0.75;

      ensureSpace(state, dropHeight + layout.lineHeight);

      state.doc.setFontSize(dropSize);
      state.doc.setFont("times", "bold");
      state.doc.text(firstChar, ml, state.y + dropHeight * 0.85);
      const dropWidth = state.doc.getTextWidth(firstChar) + 4;

      state.doc.setFontSize(layout.bodySize);
      state.doc.setFont("times", "normal");
      const wrappedWidth = cw - dropWidth;
      const allLines = state.doc.splitTextToSize(restOfPara, wrappedWidth);
      const wrapLines = allLines.slice(0, 3);
      const remainingLines = allLines.slice(3);

      const startY = state.y;
      for (let li = 0; li < wrapLines.length; li++) {
        state.doc.text(wrapLines[li], ml + dropWidth, startY + li * layout.lineHeight, { maxWidth: wrappedWidth });
      }
      state.y = startY + Math.max(wrapLines.length, 3) * layout.lineHeight;

      if (remainingLines.length > 0) {
        const remainingText = remainingLines.join(" ");
        const fullLines = state.doc.splitTextToSize(remainingText, cw);
        for (const line of fullLines) {
          ensureSpace(state, layout.lineHeight);
          state.doc.text(line, ml, state.y, { maxWidth: cw });
          state.y += layout.lineHeight;
        }
      }
      state.y += 4;
    } else {
      const indent = firstTextParagraph ? 0 : 14;
      const lines = state.doc.splitTextToSize(para, cw - indent);
      for (let li = 0; li < lines.length; li++) {
        ensureSpace(state, layout.lineHeight);
        const x = ml + (li === 0 ? indent : 0);
        state.doc.text(lines[li], x, state.y, { maxWidth: cw - (li === 0 ? indent : 0) });
        state.y += layout.lineHeight;
      }
      state.y += 3;
    }

    firstTextParagraph = false;
  }
}

export async function generatePdf(project: BookProject, options?: PdfExportOptions): Promise<Blob> {
  const layout = PDF_EXPORT_PRESETS[options?.preset || defaultPdfPreset()];
  const normalizedProject = prepareExportProject(project);
  const { config, frontMatter, chapters, backMatter } = normalizedProject;
  const doc = new jsPDF({ unit: "pt", format: [layout.pageW, layout.pageH], compress: true });
  const author = (config.authorName || config.author || config.writerName || "Unknown Author").trim();
  const cw = contentWidth(layout);

  const state: PdfState = {
    layout,
    doc,
    y: layout.marginTop,
    pageNum: 1,
    bookTitle: config.title || "Untitled",
    authorName: author,
    currentChapterTitle: "",
    inFrontMatter: true,
    romanNumeral: 1,
    suppressRunningHead: true,
  };

  state.y = layout.pageH * 0.42;
  doc.setFontSize(20);
  doc.setFont("times", "italic");
  doc.text(state.bookTitle, layout.pageW / 2, state.y, { align: "center", maxWidth: cw });

  state.suppressRunningHead = true;
  newPage(state);
  state.suppressRunningHead = true;
  newPage(state);
  state.y = layout.pageH * 0.32;
  doc.setFontSize(28);
  doc.setFont("times", "bold");
  doc.text(state.bookTitle, layout.pageW / 2, state.y, { align: "center", maxWidth: cw });
  state.y += 40;
  if (config.subtitle) {
    doc.setFontSize(15);
    doc.setFont("times", "italic");
    doc.text(config.subtitle, layout.pageW / 2, state.y, { align: "center", maxWidth: cw });
    state.y += 30;
  }
  state.y = layout.pageH * 0.78;
  doc.setFontSize(13);
  doc.setFont("times", "normal");
  doc.text(author, layout.pageW / 2, state.y, { align: "center" });

  if (frontMatter) {
    const fmSections: [string, string][] = [
      [exportLabel("copyright", config.language), frontMatter.copyright],
      [exportLabel("dedication", config.language), frontMatter.dedication],
      [exportLabel("aboutAuthor", config.language), frontMatter.aboutAuthor],
      [exportLabel("howToUse", config.language), frontMatter.howToUse],
      [exportLabel("letterToReader", config.language), frontMatter.letterToReader],
    ];
    for (const [title, content] of fmSections) {
      const txt = safeText(content);
      if (!txt) continue;
      ensureRectoPage(state);
      state.y += 50;
      writeCenteredTitle(state, title, 16);
      state.y += 14;
      writeParagraphsWithDropCap(state, txt, false);
    }

    ensureRectoPage(state);
    state.y += 50;
    writeCenteredTitle(state, exportLabel("contents", config.language), 18);
    state.y += 24;
    doc.setFontSize(layout.bodySize);
    doc.setFont("times", "normal");
    const ml = getMarginLeft(state);
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (!ch) continue;
      ensureSpace(state, layout.lineHeight);
      const num = String(i + 1).padStart(2, " ");
      const title = cleanMarkdown(formatChapterDisplayTitle(i, ch.title, {
        config,
        summary: project.blueprint?.chapterOutlines?.[i]?.summary,
        totalChapters: config.numberOfChapters,
      }));
      doc.text(`${num}.   ${title}`, ml, state.y, { maxWidth: cw });
      state.y += layout.lineHeight * 1.3;
    }
  }

  state.inFrontMatter = false;
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (!ch || (!ch.content && (!ch.subchapters || ch.subchapters.length === 0))) continue;

    const chapterTitle = cleanMarkdown(resolveChapterTitle(ch.title, i, {
      config,
      summary: project.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: config.numberOfChapters,
    }));
    state.currentChapterTitle = chapterTitle;
    ensureRectoPage(state);

    state.y = layout.marginTop + 90;
    doc.setFontSize(11);
    doc.setFont("times", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`${exportLabel("chapter", config.language)} ${i + 1}`, getMarginLeft(state) + cw / 2, state.y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    state.y += 30;
    writeCenteredTitle(state, chapterTitle, layout.headingSize);
    state.y += 30;
    if (layout.useOrnament) {
      doc.setFontSize(10);
      doc.text("✦  ✦  ✦", getMarginLeft(state) + cw / 2, state.y, { align: "center" });
      state.y += 28;
    }

    writeParagraphsWithDropCap(state, ch.content, layout.useDropCap);

    if (ch.subchapters) {
      for (const sub of ch.subchapters) {
        if (!sub.content) continue;
        writeSectionTitle(state, sub.title, 13);
        writeParagraphsWithDropCap(state, sub.content, false);
      }
    }
  }

  if (backMatter) {
    const bmSections: [string, string][] = [
      [exportLabel("conclusion", config.language), backMatter.conclusion],
      [exportLabel("authorNote", config.language), backMatter.authorNote],
      [exportLabel("whatsNext", config.language), backMatter.callToAction],
      [exportLabel("smallRequest", config.language), backMatter.reviewRequest],
      [exportLabel("otherBooks", config.language), backMatter.otherBooks],
      [exportLabel("followAuthor", config.language), backMatter.followAuthor],
    ];
    for (const [title, content] of bmSections) {
      const txt = safeText(content);
      if (!txt) continue;
      ensureRectoPage(state);
      state.currentChapterTitle = title;
      state.y = layout.marginTop + 60;
      writeCenteredTitle(state, title, layout.headingSize);
      state.y += 24;
      writeParagraphsWithDropCap(state, txt, false);
    }
  }

  addRunningHeadAndPageNum(state);
  return doc.output("blob");
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
