import { normalizeExportProject, exportLabel, cleanExportText, parseExportBlocks, cleanMarkdownInline } from "@/lib/export-cleanup";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import jsPDF from "jspdf";
import { BookProject } from "@/types/book";

function safeText(text: unknown): string {
  if (!text) return "";
  if (typeof text === "string") return text;
  if (typeof text === "object") return JSON.stringify(text);
  return String(text);
}

function cleanMarkdown(text: string): string {
  return cleanMarkdownInline(text);
}

// 6x9 inch trim — KDP paperback standard
const PAGE_W = 432;
const PAGE_H = 648;
const MARGIN_TOP = 72;       // 1"
const MARGIN_BOTTOM = 72;    // 1"
const MARGIN_INNER = 79.2;   // 1.1" (KDP min for binding)
const MARGIN_OUTER = 54;     // 0.75"
const CONTENT_W = PAGE_W - MARGIN_INNER - MARGIN_OUTER;
const LINE_HEIGHT = 14.5;
const BODY_SIZE = 10.5;
const HEADING_SIZE = 18;
const RUNNING_HEAD_SIZE = 8.5;
const PAGE_NUM_SIZE = 9;

interface PdfState {
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

function getMarginLeft(pageNum: number): number {
  return pageNum % 2 === 1 ? MARGIN_INNER : MARGIN_OUTER;
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
  if (state.suppressRunningHead) return;
  const { doc, pageNum } = state;
  const isOdd = pageNum % 2 === 1;
  const ml = getMarginLeft(pageNum);

  // Running head: even = author, odd = chapter title (or book title in front matter)
  doc.setFontSize(RUNNING_HEAD_SIZE);
  doc.setFont("times", "italic");
  doc.setTextColor(80, 80, 80);
  const headText = isOdd
    ? (cleanExportText(state.currentChapterTitle || state.bookTitle)).toUpperCase()
    : state.authorName.toUpperCase();
  doc.text(headText, isOdd ? ml + CONTENT_W : ml, MARGIN_TOP - 28, {
    align: isOdd ? "right" : "left",
    maxWidth: CONTENT_W,
  });

  // Page number — Roman in front matter, Arabic in body
  doc.setFontSize(PAGE_NUM_SIZE);
  doc.setFont("times", "normal");
  doc.setTextColor(40, 40, 40);
  const pageLabel = state.inFrontMatter ? toRoman(state.romanNumeral) : String(pageNum);
  doc.text(pageLabel, isOdd ? ml + CONTENT_W : ml, PAGE_H - 36, {
    align: isOdd ? "right" : "left",
  });
  doc.setTextColor(0, 0, 0);
}

function newPage(state: PdfState) {
  addRunningHeadAndPageNum(state);
  state.doc.addPage([PAGE_W, PAGE_H]);
  state.pageNum++;
  if (state.inFrontMatter) state.romanNumeral++;
  state.y = MARGIN_TOP;
  state.suppressRunningHead = false;
}

function ensureSpace(state: PdfState, needed: number) {
  if (state.y + needed > PAGE_H - MARGIN_BOTTOM - 20) {
    newPage(state);
  }
}

function ensureRectoPage(state: PdfState) {
  // Chapter must start on right (odd) page
  if (state.pageNum % 2 === 0) {
    state.suppressRunningHead = true; // blank verso
    newPage(state);
  } else {
    newPage(state);
  }
}

function writeCenteredTitle(state: PdfState, text: string, size: number, italic: boolean = false) {
  ensureSpace(state, size * 2);
  state.doc.setFontSize(size);
  state.doc.setFont("times", italic ? "italic" : "bold");
  const ml = getMarginLeft(state.pageNum);
  const lines = state.doc.splitTextToSize(cleanMarkdown(text), CONTENT_W);
  for (const line of lines) {
    state.doc.text(line, ml + CONTENT_W / 2, state.y, { align: "center" });
    state.y += size * 1.3;
  }
}

function writeSectionTitle(state: PdfState, text: string, size: number = 13) {
  ensureSpace(state, size * 2.5);
  state.y += size * 0.8;
  state.doc.setFontSize(size);
  state.doc.setFont("times", "bold");
  const ml = getMarginLeft(state.pageNum);
  state.doc.text(cleanMarkdown(text), ml, state.y, { maxWidth: CONTENT_W });
  state.y += size * 1.6;
}

function writePlainLines(state: PdfState, text: string, opts?: { indent?: number; boldPrefix?: string }) {
  const ml = getMarginLeft(state.pageNum);
  const indent = opts?.indent || 0;
  const prefix = opts?.boldPrefix || "";
  const full = `${prefix}${text}`;
  const lines = state.doc.splitTextToSize(full, CONTENT_W - indent);
  state.doc.setFontSize(BODY_SIZE);
  state.doc.setFont("times", "normal");
  for (let li = 0; li < lines.length; li++) {
    ensureSpace(state, LINE_HEIGHT);
    state.doc.text(lines[li], ml + (li === 0 ? indent : indent), state.y, { maxWidth: CONTENT_W - indent });
    state.y += LINE_HEIGHT;
  }
  state.y += 3;
}

function writeParagraphsWithDropCap(state: PdfState, text: string, useDropCap: boolean) {
  const blocks = parseExportBlocks(safeText(text));
  if (blocks.length === 0) return;

  let firstTextParagraph = true;
  state.doc.setFontSize(BODY_SIZE);
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
      const ml = getMarginLeft(state.pageNum);
      state.y += LINE_HEIGHT * 0.5;
      state.doc.setFontSize(BODY_SIZE);
      state.doc.text("✦  ✦  ✦", ml + CONTENT_W / 2, state.y, { align: "center" });
      state.y += LINE_HEIGHT * 1.5;
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
    const ml = getMarginLeft(state.pageNum);

    if (useDropCap && firstTextParagraph && para.length > 5) {
      const firstChar = para.charAt(0);
      const restOfPara = para.slice(1);
      const dropSize = 36;
      const dropHeight = dropSize * 0.75;

      ensureSpace(state, dropHeight + LINE_HEIGHT);

      state.doc.setFontSize(dropSize);
      state.doc.setFont("times", "bold");
      state.doc.text(firstChar, ml, state.y + dropHeight * 0.85);
      const dropWidth = state.doc.getTextWidth(firstChar) + 4;

      state.doc.setFontSize(BODY_SIZE);
      state.doc.setFont("times", "normal");
      const wrappedWidth = CONTENT_W - dropWidth;
      const allLines = state.doc.splitTextToSize(restOfPara, wrappedWidth);
      const wrapLines = allLines.slice(0, 3);
      const remainingLines = allLines.slice(3);

      const startY = state.y;
      for (let li = 0; li < wrapLines.length; li++) {
        state.doc.text(wrapLines[li], ml + dropWidth, startY + li * LINE_HEIGHT, { maxWidth: wrappedWidth });
      }
      state.y = startY + Math.max(wrapLines.length, 3) * LINE_HEIGHT;

      if (remainingLines.length > 0) {
        const remainingText = remainingLines.join(" ");
        const fullLines = state.doc.splitTextToSize(remainingText, CONTENT_W);
        for (const line of fullLines) {
          ensureSpace(state, LINE_HEIGHT);
          state.doc.text(line, ml, state.y, { maxWidth: CONTENT_W });
          state.y += LINE_HEIGHT;
        }
      }
      state.y += 4;
    } else {
      const indent = firstTextParagraph ? 0 : 14;
      const lines = state.doc.splitTextToSize(para, CONTENT_W - indent);
      for (let li = 0; li < lines.length; li++) {
        ensureSpace(state, LINE_HEIGHT);
        const x = ml + (li === 0 ? indent : 0);
        state.doc.text(lines[li], x, state.y, { maxWidth: CONTENT_W - (li === 0 ? indent : 0) });
        state.y += LINE_HEIGHT;
      }
      state.y += 3;
    }

    firstTextParagraph = false;
  }
}

export async function generatePdf(project: BookProject): Promise<Blob> {
  const normalizedProject = normalizeExportProject(project);
  const { config, frontMatter, chapters, backMatter } = normalizedProject;
  const doc = new jsPDF({ unit: "pt", format: [PAGE_W, PAGE_H], compress: true });
  const author = (config.authorName || config.author || config.writerName || "Antonino Campanella").trim();

  const state: PdfState = {
    doc, y: MARGIN_TOP, pageNum: 1,
    bookTitle: config.title || "Untitled",
    authorName: author,
    currentChapterTitle: "",
    inFrontMatter: true,
    romanNumeral: 1,
    suppressRunningHead: true, // title page = no head/num
  };

  // ===== HALF-TITLE PAGE (page i) =====
  state.y = PAGE_H * 0.42;
  doc.setFontSize(20);
  doc.setFont("times", "italic");
  doc.text(state.bookTitle, PAGE_W / 2, state.y, { align: "center", maxWidth: CONTENT_W });

  // ===== FULL TITLE PAGE (page iii) =====
  state.suppressRunningHead = true;
  newPage(state); // blank verso (ii)
  state.suppressRunningHead = true;
  newPage(state); // title page (iii)
  state.y = PAGE_H * 0.32;
  doc.setFontSize(28);
  doc.setFont("times", "bold");
  doc.text(state.bookTitle, PAGE_W / 2, state.y, { align: "center", maxWidth: CONTENT_W });
  state.y += 40;
  if (config.subtitle) {
    doc.setFontSize(15);
    doc.setFont("times", "italic");
    doc.text(config.subtitle, PAGE_W / 2, state.y, { align: "center", maxWidth: CONTENT_W });
    state.y += 30;
  }
  state.y = PAGE_H * 0.78;
  doc.setFontSize(13);
  doc.setFont("times", "normal");
  doc.text(author, PAGE_W / 2, state.y, { align: "center" });

  // ===== FRONT MATTER (Roman numerals) =====
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

    // TOC
    ensureRectoPage(state);
    state.y += 50;
    writeCenteredTitle(state, exportLabel("contents", config.language), 18);
    state.y += 24;
    doc.setFontSize(BODY_SIZE);
    doc.setFont("times", "normal");
    const ml = getMarginLeft(state.pageNum);
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (!ch) continue;
      ensureSpace(state, LINE_HEIGHT);
      const num = String(i + 1).padStart(2, " ");
      const title = cleanMarkdown(formatChapterDisplayTitle(i, ch.title, {
        config,
        summary: project.blueprint?.chapterOutlines?.[i]?.summary,
        totalChapters: config.numberOfChapters,
      }));
      doc.text(`${num}.   ${title}`, ml, state.y, { maxWidth: CONTENT_W });
      state.y += LINE_HEIGHT * 1.3;
    }
  }

  // ===== BODY (Arabic numerals from 1) =====
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
    if (i === 0) {
      // Reset page number to 1 at first chapter
      state.pageNum = 1;
    }

    // Chapter opener: extra space + number + title
    state.y = MARGIN_TOP + 90;
    doc.setFontSize(11);
    doc.setFont("times", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`${exportLabel("chapter", config.language)} ${i + 1}`, getMarginLeft(state.pageNum) + CONTENT_W / 2, state.y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    state.y += 30;
    writeCenteredTitle(state, chapterTitle, HEADING_SIZE);
    state.y += 30;
    // Ornamental separator
    doc.setFontSize(10);
    doc.text("✦  ✦  ✦", getMarginLeft(state.pageNum) + CONTENT_W / 2, state.y, { align: "center" });
    state.y += 28;

    writeParagraphsWithDropCap(state, ch.content, true);

    if (ch.subchapters) {
      for (const sub of ch.subchapters) {
        if (!sub.content) continue;
        writeSectionTitle(state, sub.title, 13);
        writeParagraphsWithDropCap(state, sub.content, false);
      }
    }
  }

  // ===== BACK MATTER =====
  if (backMatter) {
    const bmSections: [string, string][] = [
      [exportLabel("conclusion", config.language), backMatter.conclusion],
      [exportLabel("authorNote", config.language), backMatter.authorNote],
      [exportLabel("whatsNext", config.language), backMatter.callToAction],
      [exportLabel("smallRequest", config.language), backMatter.reviewRequest],
      [exportLabel("otherBooks", config.language), backMatter.otherBooks],
    ];
    for (const [title, content] of bmSections) {
      const txt = safeText(content);
      if (!txt) continue;
      ensureRectoPage(state);
      state.currentChapterTitle = title;
      state.y = MARGIN_TOP + 60;
      writeCenteredTitle(state, title, HEADING_SIZE);
      state.y += 24;
      writeParagraphsWithDropCap(state, txt, false);
    }
  }

  addRunningHeadAndPageNum(state); // last page

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
