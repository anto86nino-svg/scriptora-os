import { prepareExportProject } from "@/lib/export-quality-engine";
import { exportLabel, cleanExportText, parseExportBlocks, cleanMarkdownInline } from "@/lib/export-cleanup";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { DOCX_EXPORT_PRESETS, defaultDocxPreset, type DocxExportPreset, type DocxLayoutPreset } from "@/lib/export-presets";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak, Header, Footer, PageNumber,
  LevelFormat, BorderStyle, TabStopType, TabStopPosition,
} from "docx";
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

function bodyParagraphs(text: string, layout: DocxLayoutPreset, opts?: { firstNoIndent?: boolean; dropCap?: boolean }): Paragraph[] {
  const blocks = parseExportBlocks(safeText(text));
  if (blocks.length === 0) return [];

  const out: Paragraph[] = [];
  let firstTextParagraph = true;

  for (const block of blocks) {
    if (block.type === "heading2") {
      out.push(sectionH2(block.text, layout));
      firstTextParagraph = true;
      continue;
    }

    if (block.type === "heading3") {
      out.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 360, after: 160 },
        children: [new TextRun({ text: cleanMarkdown(block.text), font: layout.font, size: 24, bold: true, italics: true })],
      }));
      firstTextParagraph = true;
      continue;
    }

    if (block.type === "scene") {
      out.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [new TextRun({ text: "✦  ✦  ✦", font: layout.font, size: 22 })],
      }));
      firstTextParagraph = true;
      continue;
    }

    if (block.type === "bullet" || block.type === "numbered") {
      block.items.forEach((item, idx) => {
        out.push(new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 90, line: 300 },
          indent: { left: 360, hanging: 220 },
          children: [
            new TextRun({ text: block.type === "bullet" ? "• " : `${idx + 1}. `, font: layout.font, size: layout.bodySize, bold: true }),
            new TextRun({ text: item, font: layout.font, size: layout.bodySize }),
          ],
        }));
      });
      firstTextParagraph = false;
      continue;
    }

    const blockText = cleanMarkdown(block.text);
    if (!blockText) continue;

    if (layout.useDropCap && opts?.dropCap && firstTextParagraph && blockText.length > 3) {
      const firstChar = blockText.charAt(0);
      const rest = blockText.slice(1);
      out.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 160, line: 320 },
        children: [
          new TextRun({ text: firstChar, font: layout.font, size: layout.bodySize + 34, bold: true }),
          new TextRun({ text: rest, font: layout.font, size: layout.bodySize }),
        ],
      }));
    } else {
      const noIndent = firstTextParagraph && opts?.firstNoIndent !== false;
      out.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 120, line: 320 },
        indent: noIndent ? undefined : { firstLine: 360 },
        children: [new TextRun({ text: blockText, font: layout.font, size: layout.bodySize })],
      }));
    }

    firstTextParagraph = false;
  }

  return out;
}

function chapterOpener(num: number, title: string, layout: DocxLayoutPreset, language?: string): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({ spacing: { before: 1800 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `${exportLabel("chapter", language)} ${num}`, font: layout.font, size: layout.bodySize, italics: true, color: "666666" })],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360 },
      children: [new TextRun({ text: cleanMarkdown(title), font: layout.font, size: layout.bodySize + 18, bold: true })],
    }),
  ];
  if (layout.useOrnament) {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [new TextRun({ text: "✦  ✦  ✦", font: layout.font, size: layout.bodySize })],
    }));
  }
  return paragraphs;
}

function sectionH1(text: string, layout: DocxLayoutPreset): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 1440, after: 480 },
    children: [new TextRun({ text: cleanMarkdown(text), font: layout.font, size: layout.bodySize + 14, bold: true })],
  });
}

function sectionH2(text: string, layout: DocxLayoutPreset): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text: cleanMarkdown(text), font: layout.font, size: layout.bodySize + 6, bold: true })],
  });
}

export interface DocxExportOptions {
  preset?: DocxExportPreset;
}

export async function generateDocx(project: BookProject, options?: DocxExportOptions): Promise<Blob> {
  const layout = DOCX_EXPORT_PRESETS[options?.preset || defaultDocxPreset()];
  const normalizedProject = prepareExportProject(project);
  const { config, frontMatter, chapters, backMatter } = normalizedProject;
  const author = (config.authorName || config.author || config.writerName || "Antonino Campanella").trim();
  const bookTitle = config.title || "Untitled";

  const children: Paragraph[] = [];

  // ===== HALF TITLE =====
  children.push(new Paragraph({ spacing: { before: 4500 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: bookTitle, font: layout.font, size: layout.bodySize + 14, italics: true })],
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== TITLE PAGE =====
  children.push(new Paragraph({ spacing: { before: 3500 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text: bookTitle, font: layout.font, size: layout.bodySize + 34, bold: true })],
  }));
  if (config.subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [new TextRun({ text: config.subtitle, font: layout.font, size: layout.bodySize + 6, italics: true })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: 2400 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: author, font: layout.font, size: layout.bodySize + 4 })],
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== FRONT MATTER =====
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
      children.push(sectionH1(title, layout));
      children.push(...bodyParagraphs(txt, layout, { firstNoIndent: true }));
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // ===== TABLE OF CONTENTS =====
  children.push(sectionH1(exportLabel("contents", config.language), layout));
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (!ch) continue;
      const num = String(i + 1).padStart(2, " ");
      const title = formatChapterDisplayTitle(i, ch.title, {
        config,
        summary: project.blueprint?.chapterOutlines?.[i]?.summary,
        totalChapters: config.numberOfChapters,
      });
      children.push(new Paragraph({
        spacing: { after: 120 },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
        new TextRun({ text: `${num}.   ${cleanMarkdown(title)}`, font: layout.font, size: layout.bodySize }),
      ],
    }));
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ===== CHAPTERS =====
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (!ch || (!ch.content && (!ch.subchapters || ch.subchapters.length === 0))) continue;

    children.push(...chapterOpener(i + 1, ch.title, layout, config.language));
    children.push(...bodyParagraphs(ch.content, layout, { dropCap: layout.useDropCap, firstNoIndent: true }));

    if (ch.subchapters) {
      for (const sub of ch.subchapters) {
        if (!sub.content) continue;
        children.push(sectionH2(sub.title, layout));
        children.push(...bodyParagraphs(sub.content, layout, { firstNoIndent: true }));
      }
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ===== BACK MATTER =====
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
      children.push(sectionH1(title, layout));
      children.push(...bodyParagraphs(txt, layout, { firstNoIndent: true }));
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // ===== HEADERS / FOOTERS (alternate odd/even) =====
  const evenHeader = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 4 } },
      children: [new TextRun({ text: author.toUpperCase(), font: layout.font, size: 18, italics: true, color: "666666" })],
    })],
  });
  const oddHeader = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 4 } },
      children: [new TextRun({ text: bookTitle.toUpperCase(), font: layout.font, size: 18, italics: true, color: "666666" })],
    })],
  });
  const evenFooter = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: layout.font, size: 20 })],
    })],
  });
  const oddFooter = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ children: [PageNumber.CURRENT], font: layout.font, size: 20 })],
    })],
  });

  const doc = new Document({
    creator: author,
    title: bookTitle,
    description: config.subtitle || "",
    styles: {
      default: { document: { run: { font: layout.font, size: layout.bodySize } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: layout.bodySize + 14, bold: true, font: layout.font },
          paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: layout.bodySize + 6, bold: true, font: layout.font },
          paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: layout.pageWidth, height: layout.pageHeight },
          margin: {
            top: layout.marginTop,
            right: layout.marginRight,
            bottom: layout.marginBottom,
            left: layout.marginLeft,
            header: 540,
            footer: 540,
          },
        },
        titlePage: true, // suppress header/footer on first page
      },
      headers: { default: oddHeader, even: evenHeader, first: undefined },
      footers: { default: oddFooter, even: evenFooter, first: undefined },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}

export function downloadDocx(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
