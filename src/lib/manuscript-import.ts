import JSZip from "jszip";

/** File picker accept list — mirrors export formats (EPUB, PDF, DOCX) plus common drafts. */
export const MANUSCRIPT_FILE_ACCEPT =
  ".txt,.md,.markdown,.docx,.epub,.pdf,.html,.htm,.odt,.rtf," +
  "text/plain,text/markdown,text/html,application/rtf,text/rtf," +
  "application/epub+zip,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.oasis.opendocument.text";

export const MANUSCRIPT_FORMAT_LABEL = "TXT, MD, DOCX, EPUB, PDF, HTML, ODT, RTF";

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
  const rootfile = doc.querySelector("rootfile");
  return rootfile?.getAttribute("full-path") || null;
}

function spineHrefsFromOpf(opfXml: string, opfDir: string): string[] {
  const doc = new DOMParser().parseFromString(opfXml, "application/xml");
  const manifest = new Map<string, string>();
  doc.querySelectorAll("manifest item, item").forEach(item => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) manifest.set(id, href);
  });

  const hrefs: string[] = [];
  doc.querySelectorAll("spine itemref, itemref").forEach(itemref => {
    const idref = itemref.getAttribute("idref");
    const href = idref ? manifest.get(idref) : null;
    if (href) {
      const normalized = opfDir ? `${opfDir}/${href}`.replace(/\/+/g, "/") : href;
      hrefs.push(normalized);
    }
  });
  return hrefs;
}

function isSkippableEpubAsset(path: string): boolean {
  const base = path.split("/").pop()?.toLowerCase() || path.toLowerCase();
  return /^(nav|toc|cover|titlepage|halftitle|copyright|dedication|aboutauthor|style|nav\.xhtml|toc\.ncx)/.test(base);
}

async function readEpub(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await fileToArrayBuffer(file));
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  let orderedPaths: string[] = [];

  if (containerXml) {
    const opfPath = opfPathFromContainer(containerXml);
    if (opfPath) {
      const opfXml = await zip.file(opfPath)?.async("text");
      if (opfXml) {
        const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";
        orderedPaths = spineHrefsFromOpf(opfXml, opfDir).filter(path => !isSkippableEpubAsset(path));
      }
    }
  }

  if (!orderedPaths.length) {
    orderedPaths = Object.keys(zip.files)
      .filter(path => /\.(xhtml|html|htm)$/i.test(path) && !isSkippableEpubAsset(path))
      .sort();
  }

  const sections: string[] = [];
  for (const path of orderedPaths) {
    const html = await zip.file(path)?.async("text");
    if (!html) continue;
    const plain = htmlToPlainText(html);
    if (plain) sections.push(plain);
  }

  if (!sections.length) throw new Error("EPUB_EMPTY");
  return sections.join("\n\n").trim();
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
