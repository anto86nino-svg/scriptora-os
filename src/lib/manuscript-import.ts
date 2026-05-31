import JSZip from "jszip";
import type { BookProject, BookConfig, Chapter, Language } from "@/types/book";
import { createProjectId } from "@/services/storageService";

/** File picker accept list — mirrors export formats (EPUB, PDF, DOCX) plus common drafts. */
export const MANUSCRIPT_FILE_ACCEPT =
  ".txt,.md,.markdown,.docx,.epub,.pdf,.html,.htm,.odt,.rtf," +
  "text/plain,text/markdown,text/html,application/rtf,text/rtf," +
  "application/epub+zip,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.oasis.opendocument.text";

export const MANUSCRIPT_FORMAT_LABEL = "TXT, MD, DOCX, EPUB, PDF, HTML, ODT, RTF";

export const IMPORT_DRAFT_STORAGE_KEY = "scriptora-import-draft";

type ManuscriptFormat =
  | "txt"
  | "md"
  | "docx"
  | "epub"
  | "pdf"
  | "html"
  | "odt"
  | "rtf";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function detectFormat(file: File): ManuscriptFormat | null {
  const ext = extensionOf(file.name);
  const mime = (file.type || "").toLowerCase();

  if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
  if (ext === "epub" || mime === "application/epub+zip") return "epub";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "odt" || mime.includes("opendocument.text")) return "odt";
  if (ext === "rtf" || mime.includes("rtf")) return "rtf";
  if (ext === "html" || ext === "htm" || mime === "text/html") return "html";
  if (ext === "md" || ext === "markdown" || mime.includes("markdown")) return "md";
  if (ext === "txt" || mime.startsWith("text/")) return "txt";
  return null;
}

export function titleFromFileName(name: string, fallback = "Libro importato"): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base || fallback;
}

export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, nav, noscript").forEach(node => node.remove());

  const body = doc.body || doc.documentElement;
  const blocks: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (text) blocks.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      blocks.push("");
      return;
    }
    const blockTags = new Set(["p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"]);
    if (blockTags.has(tag)) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (text) blocks.push(text);
      return;
    }
    el.childNodes.forEach(walk);
  };

  body.childNodes.forEach(walk);
  return blocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function xmlTextBlocks(xml: string, blockLocalNames: string[]): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return "";

  const blocks: string[] = [];
  const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode as Element | null;
  while (node) {
    if (blockLocalNames.includes(node.localName || node.tagName.split(":").pop() || "")) {
      const text = Array.from(node.childNodes)
        .map(child => child.textContent || "")
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (text) blocks.push(text);
    }
    node = walker.nextNode() as Element | null;
  }
  return blocks.join("\n\n");
}

async function fileToArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Response(file).arrayBuffer();
}

async function fileToText(file: Blob): Promise<string> {
  if (typeof file.text === "function") return file.text();
  const buffer = await fileToArrayBuffer(file);
  return new TextDecoder().decode(buffer);
}

function elementsByLocalName(doc: Document | Element, localName: string): Element[] {
  const root = "documentElement" in doc ? doc.documentElement : doc;
  return Array.from(root.getElementsByTagName("*")).filter(
    el => (el.localName || el.tagName.split(":").pop() || "").toLowerCase() === localName.toLowerCase(),
  );
}

function resolveZipPath(baseDir: string, href: string): string {
  const decoded = decodeURIComponent(href).replace(/\\/g, "/");
  const combined = baseDir ? `${baseDir}/${decoded}` : decoded;
  const parts = combined.split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") stack.pop();
    else if (part && part !== ".") stack.push(part);
  }
  return stack.join("/");
}

async function readDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await fileToArrayBuffer(file));
  const xml = await zip.file("word/document.xml")?.async("text");
  if (!xml) throw new Error("DOCX_MISSING_BODY");
  return xmlTextBlocks(xml, ["p"]);
}

async function readOdt(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await fileToArrayBuffer(file));
  const xml = await zip.file("content.xml")?.async("text");
  if (!xml) throw new Error("ODT_MISSING_BODY");
  return xmlTextBlocks(xml, ["p", "h"]);
}

function readRtf(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  text = text.replace(/\\par[d]?/g, "\n");
  text = text.replace(/\\line/g, "\n");
  text = text.replace(/\\tab/g, "\t");
  text = text.replace(/\\u(-?\d+)\??/g, (_, code: string) => String.fromCharCode(Number(code)));
  text = text.replace(/\{\\\*\\[^}]+\}/g, "");
  text = text.replace(/[{}]/g, "");
  text = text.replace(/\\[a-z]+-?\d* ?/gi, "");
  return text
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function opfPathFromContainer(containerXml: string): string | null {
  const doc = new DOMParser().parseFromString(containerXml, "application/xml");
  const rootfiles = elementsByLocalName(doc, "rootfile");
  const rootfile = rootfiles.find(el => el.getAttribute("media-type")?.includes("oebps-package"))
    ?? rootfiles[0];
  return rootfile?.getAttribute("full-path") || null;
}

function spineHrefsFromOpf(opfXml: string, opfDir: string): string[] {
  const doc = new DOMParser().parseFromString(opfXml, "application/xml");
  const manifest = new Map<string, string>();

  for (const item of elementsByLocalName(doc, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = (item.getAttribute("media-type") || "").toLowerCase();
    if (!id || !href) continue;
    if (mediaType && !mediaType.includes("html") && !mediaType.includes("xml") && mediaType !== "application/x-dtbncx+xml") {
      if (!/\.(xhtml|html|htm)$/i.test(href)) continue;
    }
    manifest.set(id, href);
  }

  const hrefs: string[] = [];
  for (const itemref of elementsByLocalName(doc, "itemref")) {
    const idref = itemref.getAttribute("idref");
    const linear = itemref.getAttribute("linear");
    if (linear === "no") continue;
    const href = idref ? manifest.get(idref) : null;
    if (href) hrefs.push(resolveZipPath(opfDir, href));
  }
  return hrefs;
}

function isSkippableEpubAsset(path: string): boolean {
  const base = path.split("/").pop()?.toLowerCase() || path.toLowerCase();
  return /^(nav|toc|cover|titlepage|halftitle|copyright|dedication|aboutauthor|style|nav\.xhtml|toc\.ncx)/.test(base);
}

async function readZipEntryText(zip: JSZip, path: string): Promise<string | null> {
  const direct = await zip.file(path)?.async("text");
  if (direct) return direct;

  const lower = path.toLowerCase();
  const match = Object.keys(zip.files).find(key => key.toLowerCase() === lower);
  if (match) return zip.file(match)?.async("text") ?? null;
  return null;
}

async function readEpubSections(zip: JSZip, orderedPaths: string[]): Promise<string[]> {
  const sections: string[] = [];
  for (const path of orderedPaths) {
    try {
      const html = await readZipEntryText(zip, path);
      if (!html) continue;
      const plain = htmlToPlainText(html);
      if (plain) sections.push(plain);
    } catch {
      /* skip broken spine item */
    }
  }
  return sections;
}

async function readEpubFallbackPaths(zip: JSZip): Promise<string[]> {
  return Object.keys(zip.files)
    .filter(path => /\.(xhtml|html|htm)$/i.test(path) && !isSkippableEpubAsset(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function readEpub(file: File): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(await fileToArrayBuffer(file));
    let orderedPaths: string[] = [];

    try {
      const containerXml = await readZipEntryText(zip, "META-INF/container.xml");
      if (containerXml) {
        const opfPath = opfPathFromContainer(containerXml);
        if (opfPath) {
          const opfXml = await readZipEntryText(zip, opfPath);
          if (opfXml) {
            const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";
            orderedPaths = spineHrefsFromOpf(opfXml, opfDir).filter(path => !isSkippableEpubAsset(path));
          }
        }
      }
    } catch {
      /* fall through to filename scan */
    }

    if (!orderedPaths.length) {
      orderedPaths = await readEpubFallbackPaths(zip);
    }

    let sections = await readEpubSections(zip, orderedPaths);
    if (!sections.length) {
      orderedPaths = await readEpubFallbackPaths(zip);
      sections = await readEpubSections(zip, orderedPaths);
    }

    if (!sections.length) throw new Error("EPUB_EMPTY");
    return sections.join("\n\n").trim();
  } catch (err) {
    if (err instanceof Error && err.message === "EPUB_EMPTY") throw err;
    throw new Error("EPUB_PARSE_FAILED");
  }
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const data = new Uint8Array(await fileToArrayBuffer(file));
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const line = content.items
      .map(item => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) pages.push(line);
  }

  if (!pages.length) throw new Error("PDF_EMPTY");
  return pages.join("\n\n").trim();
}

export function persistImportDraft(payload: { fileName: string; text?: string; error?: string }) {
  try {
    sessionStorage.setItem(
      IMPORT_DRAFT_STORAGE_KEY,
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage full or private mode */
  }
}

export function normalizeImportedProject(
  project: BookProject,
  fallbacks: { title?: string; language?: Language } = {},
): BookProject {
  const now = new Date().toISOString();
  const title = project.config?.title?.trim() || fallbacks.title || "Libro importato";
  const language = project.config?.language || fallbacks.language || "Italian";

  let chapters: Chapter[] = Array.isArray(project.chapters)
    ? project.chapters.filter(Boolean)
    : [];

  if (!chapters.length) {
    chapters = [{
      title: "Chapter 1",
      content: "",
      subchapters: [],
      status: "idle",
    }];
  }

  chapters = chapters.map((chapter, index) => ({
    ...chapter,
    title: chapter.title?.trim() || `Chapter ${index + 1}`,
    content: typeof chapter.content === "string" ? chapter.content : "",
    subchapters: Array.isArray(chapter.subchapters) ? chapter.subchapters : [],
    status: chapter.status || "completed",
  }));

  const baseConfig: BookConfig = {
    title: "",
    subtitle: "",
    tone: "clear, polished, emotionally precise, editorial",
    authorStyle: "editorial rewrite guided by manuscript diagnosis",
    language: "Italian",
    genre: "self-help",
    category: "Self Help",
    subcategory: "Mindset",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 1,
    subchaptersEnabled: false,
  };

  const config: BookConfig = {
    ...baseConfig,
    ...project.config,
    title,
    language,
    numberOfChapters: Math.max(1, chapters.length),
  };

  return {
    ...project,
    id: project.id || createProjectId(),
    config,
    blueprint: project.blueprint ?? {
      overview: "",
      chapterOutlines: chapters.map(chapter => ({ title: chapter.title, summary: "" })),
      themes: [],
      emotionalArc: "",
    },
    frontMatter: project.frontMatter ?? null,
    chapters,
    backMatter: project.backMatter ?? null,
    phase: project.phase || "complete",
    createdAt: project.createdAt || now,
    updatedAt: now,
  };
}

export async function readManuscriptFile(file: File, unsupportedMessage: string): Promise<string> {
  const format = detectFormat(file);
  if (!format) throw new Error(unsupportedMessage);

  switch (format) {
    case "txt":
    case "md":
      return (await fileToText(file)).trim();
    case "html":
      return htmlToPlainText(await fileToText(file));
    case "rtf":
      return readRtf(await fileToText(file));
    case "docx":
      return await readDocx(file);
    case "odt":
      return await readOdt(file);
    case "epub":
      return await readEpub(file);
    case "pdf":
      return await readPdf(file);
    default:
      throw new Error(unsupportedMessage);
  }
}
