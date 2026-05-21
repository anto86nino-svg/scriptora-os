import { normalizeExportProject, exportLabel, cleanExportText, parseExportBlocks, cleanMarkdownInline } from "@/lib/export-cleanup";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";
import { BookProject } from "@/types/book";

function escapeXml(str: unknown): string {
  const s = str == null ? "" : typeof str === "string" ? str : String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function typographicQuotes(s: string): string {
  return s
    .replace(/(^|[\s(\[])"/g, "$1\u201C")
    .replace(/"/g, "\u201D")
    .replace(/(^|[\s(\[])'/g, "$1\u2018")
    .replace(/'/g, "\u2019")
    .replace(/--/g, "\u2014")
    .replace(/\.\.\./g, "\u2026");
}

function textToHtml(text: unknown, opts?: { dropCap?: boolean }): string {
  const blocks = parseExportBlocks(text);
  let firstParagraph = true;

  return blocks.map((block) => {
    if (block.type === "heading2") return `<h2>${escapeXml(block.text)}</h2>`;
    if (block.type === "heading3") return `<h3>${escapeXml(block.text)}</h3>`;
    if (block.type === "scene") return `<p class="scene-break">✦ ✦ ✦</p>`;

    if (block.type === "bullet") {
      return `<ul>\n${block.items.map((i) => `<li>${escapeXml(i)}</li>`).join("\n")}\n</ul>`;
    }

    if (block.type === "numbered") {
      return `<ol>\n${block.items.map((i) => `<li>${escapeXml(i)}</li>`).join("\n")}\n</ol>`;
    }

    const cls = firstParagraph ? (opts?.dropCap ? "dropcap" : "first") : "";
    firstParagraph = false;
    const clean = cleanMarkdownInline(block.text);
    return cls ? `<p class="${cls}">${escapeXml(clean)}</p>` : `<p>${escapeXml(clean)}</p>`;
  }).join("\n");
}

function createXhtml(title: string, body: string, cssPath = "style.css"): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="${cssPath}"/>
</head>
<body>
${body}
</body>
</html>`;
}

const STYLESHEET = `/* Bestseller-grade EPUB stylesheet — KDP/Kindle/Apple Books/Kobo optimized */
@namespace epub "http://www.idpf.org/2007/ops";

body {
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
  margin: 1.4em 1.2em;
  line-height: 1.55;
  color: #1a1a1a;
  orphans: 2;
  widows: 2;
  -webkit-hyphens: auto;
  -epub-hyphens: auto;
  hyphens: auto;
  text-rendering: optimizeLegibility;
}
h1, h2, h3, h4 {
  font-family: "Optima", "Avenir Next", "Helvetica Neue", "Trebuchet MS", sans-serif;
  font-weight: 600;
  -webkit-hyphens: none;
  hyphens: none;
  page-break-after: avoid;
  -webkit-column-break-after: avoid;
  break-after: avoid;
}
h1 {
  font-size: 1.7em;
  margin: 1.2em 0 1.4em;
  color: #0a0a0a;
  page-break-before: always;
  text-align: center;
  letter-spacing: 0.02em;
}
h2 {
  font-size: 1.25em;
  margin: 2em 0 0.6em;
  color: #222;
  text-align: left;
}
h3 {
  font-size: 1.05em;
  margin: 1.5em 0 0.4em;
  color: #333;
  font-style: italic;
}
p {
  margin: 0;
  text-align: justify;
  text-indent: 1.4em;
  text-justify: inter-word;
}
p.first, p.no-indent, p + p.first {
  text-indent: 0;
}
.no-indent p {
  text-indent: 0;
}
.center {
  text-align: center;
  text-indent: 0;
}
/* Drop cap on first paragraph of chapter */
p.dropcap {
  text-indent: 0;
}
p.dropcap::first-letter {
  font-family: "Optima", "Avenir Next", "Trebuchet MS", sans-serif;
  font-size: 3.6em;
  font-weight: 700;
  float: left;
  line-height: 0.85;
  margin: 0.05em 0.08em -0.05em 0;
  color: #2a2a2a;
}
/* Scene break ornament */
.scene-break {
  text-align: center;
  margin: 1.4em 0;
  text-indent: 0;
  font-size: 0.9em;
  letter-spacing: 0.5em;
  color: #666;
}
/* Chapter opener */
.chapter-num {
  font-family: "Optima", "Avenir Next", sans-serif;
  text-align: center;
  font-size: 0.85em;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #888;
  margin: 0.5em 0 0.4em;
  text-indent: 0;
}
.chapter-ornament {
  text-align: center;
  font-size: 0.9em;
  color: #666;
  margin: 1em 0 1.6em;
  letter-spacing: 0.5em;
  text-indent: 0;
}
/* Title page */
.title-page {
  text-align: center;
  page-break-after: always;
  page-break-before: always;
}
.title-page h1 {
  font-size: 2.4em;
  margin-top: 28%;
  page-break-before: avoid;
  letter-spacing: 0.03em;
}
.title-page .subtitle {
  font-size: 1.15em;
  font-style: italic;
  color: #555;
  margin-top: 0.6em;
  letter-spacing: 0.02em;
}
.title-page .author {
  margin-top: 4em;
  font-size: 1em;
  color: #333;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.half-title {
  text-align: center;
  font-style: italic;
  font-size: 1.4em;
  margin-top: 40%;
  color: #333;
  letter-spacing: 0.05em;
}
/* TOC */
.toc-list {
  list-style: none;
  padding: 0;
  margin: 1em 0;
}
.toc-list li {
  margin: 0.6em 0;
  text-indent: 0;
}
.toc-list a {
  text-decoration: none;
  color: #1a3a6a;
}
.toc-list .sub {
  margin-left: 1.8em;
  font-size: 0.92em;
  color: #555;
}
nav ol {
  list-style: none;
  padding: 0;
}
nav li {
  margin: 0.4em 0;
}
nav a {
  color: #1a3a6a;
  text-decoration: none;
}
/* Block quote */
blockquote {
  margin: 1em 1.5em;
  padding-left: 0.8em;
  border-left: 2px solid #999;
  font-style: italic;
  color: #444;
}
.chapter-break {
  page-break-before: always;
}
`;

interface ContentEntry {
  id: string;
  filename: string;
  title: string;
  body: string;
  children?: { id: string; title: string }[];
  landmark?: string; // epub:type for landmarks
}

function getTocLabel(lang: string): string {
  const map: Record<string, string> = {
    English: "Table of Contents", Italian: "Indice", Spanish: "Índice",
    French: "Table des matières", German: "Inhaltsverzeichnis",
  };
  return map[lang] || "Table of Contents";
}

function getFrontMatterLabels(lang: string) {
  const labels: Record<string, Record<string, string>> = {
    English: { titlePage: "Title Page", copyright: exportLabel("copyright", lang), dedication: exportLabel("dedication", lang), aboutAuthor: exportLabel("aboutAuthor", lang), howToUse: exportLabel("howToUse", lang), letterToReader: exportLabel("letterToReader", lang) },
    Italian: { titlePage: "Pagina del Titolo", copyright: exportLabel("copyright", lang), dedication: "Dedica", aboutAuthor: "L'Autore", howToUse: "Come Usare Questo Libro", letterToReader: "Lettera al Lettore" },
    Spanish: { titlePage: "Portada", copyright: "Derechos de Autor", dedication: "Dedicatoria", aboutAuthor: "Sobre el Autor", howToUse: "Cómo Usar Este Libro", letterToReader: "Carta al Lector" },
    French: { titlePage: "Page de Titre", copyright: "Droits d'Auteur", dedication: "Dédicace", aboutAuthor: "À Propos de l'Auteur", howToUse: "Comment Utiliser Ce Livre", letterToReader: "Lettre au Lecteur" },
    German: { titlePage: "Titelseite", copyright: "Urheberrecht", dedication: "Widmung", aboutAuthor: "Über den Autor", howToUse: "Wie Sie Dieses Buch Nutzen", letterToReader: "Brief an den Leser" },
  };
  return labels[lang] || labels.English;
}

function getBackMatterLabels(lang: string) {
  const labels: Record<string, Record<string, string>> = {
    English: { conclusion: exportLabel("conclusion", lang), authorNote: exportLabel("authorNote", lang), callToAction: exportLabel("whatsNext", lang), reviewRequest: exportLabel("smallRequest", lang), otherBooks: exportLabel("otherBooks", lang) },
    Italian: { conclusion: "Conclusione", authorNote: "Nota dell'Autore", callToAction: "E Adesso?", reviewRequest: "Una Piccola Richiesta", otherBooks: "Altri Libri" },
    Spanish: { conclusion: "Conclusión", authorNote: "Nota del Autor", callToAction: "¿Y Ahora Qué?", reviewRequest: "Una Pequeña Petición", otherBooks: "Otros Libros" },
    French: { conclusion: exportLabel("conclusion", lang), authorNote: "Note de l'Auteur", callToAction: "Et Maintenant?", reviewRequest: "Une Petite Demande", otherBooks: "Autres Livres" },
    German: { conclusion: "Fazit", authorNote: "Anmerkung des Autors", callToAction: "Was Kommt Als Nächstes?", reviewRequest: "Eine Kleine Bitte", otherBooks: "Weitere Bücher" },
  };
  return labels[lang] || labels.English;
}

export async function generateEpub(project: BookProject, coverDataUrl?: string): Promise<Blob> {
  const normalizedProject = normalizeExportProject(project);
  const { config, frontMatter, chapters, backMatter } = normalizedProject;
  const lang = config.language;
  const fmLabels = getFrontMatterLabels(lang);
  const bmLabels = getBackMatterLabels(lang);
  const tocLabel = getTocLabel(lang);
  const langCode = { English: "en", Italian: "it", Spanish: "es", French: "fr", German: "de" }[config.language] || "en";
  const uuid = crypto.randomUUID();

  const entries: ContentEntry[] = [];

  // --- Cover ---
  if (coverDataUrl) {
    entries.push({
      id: "cover", filename: "cover.xhtml", title: "Cover",
      body: `<div class="center"><img src="cover.jpg" alt="Cover" style="max-width:100%;max-height:100vh;"/></div>`,
      landmark: "cover",
    });
  }

  const author = ((config as any).authorName || (config as any).author || (config as any).writerName || "Antonino Campanella").trim();

  // --- Half title (typographic tradition) ---
  entries.push({
    id: "halftitle", filename: "halftitle.xhtml", title: config.title,
    body: `<div class="half-title">${escapeXml(config.title)}</div>`,
  });

  // --- Title Page ---
  entries.push({
    id: "titlepage", filename: "titlepage.xhtml", title: fmLabels.titlePage,
    body: `<div class="title-page">
  <h1>${escapeXml(config.title)}</h1>
  ${config.subtitle ? `<p class="subtitle">${escapeXml(config.subtitle)}</p>` : ""}
  <p class="author">${escapeXml(author)}</p>
</div>`,
    landmark: "titlepage",
  });

  // --- Front Matter ---
  if (frontMatter) {
    const fmSections: [string, string, string | undefined, string?][] = [
      ["copyright", fmLabels.copyright, frontMatter.copyright, "copyright-page"],
      ["dedication", fmLabels.dedication, frontMatter.dedication, "dedication"],
      ["aboutauthor", fmLabels.aboutAuthor, frontMatter.aboutAuthor],
      ["howtouse", fmLabels.howToUse, frontMatter.howToUse, "preface"],
      ["letter", fmLabels.letterToReader, frontMatter.letterToReader, "foreword"],
    ];
    for (const [id, title, content, landmark] of fmSections) {
      if (content) {
        entries.push({
          id, filename: `${id}.xhtml`, title,
          body: `<h1>${escapeXml(title)}</h1>\n${textToHtml(content)}`,
          landmark,
        });
      }
    }
  }

  // --- TOC page placeholder index ---
  const tocPageIndex = entries.length;

  // --- Chapters (each as separate file, with bestseller chapter opener) ---
  chapters.forEach((ch, i) => {
    const chId = `chapter${i + 1}`;
    const chTitle = resolveChapterTitle(ch.title, i, {
      config,
      summary: project.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: config.numberOfChapters,
    });
    const displayTitle = formatChapterDisplayTitle(i, chTitle, {
      config,
      summary: project.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: config.numberOfChapters,
    });
    const chapterNumLabel = lang === "Italian" ? `Capitolo ${i + 1}`
      : lang === "Spanish" ? `Capítulo ${i + 1}`
      : lang === "French" ? `Chapitre ${i + 1}`
      : lang === "German" ? `Kapitel ${i + 1}`
      : `${exportLabel("chapter", config.language)} ${i + 1}`;
    let body = `<p class="chapter-num">${escapeXml(chapterNumLabel)}</p>
<h1>${escapeXml(chTitle)}</h1>
<p class="chapter-ornament">\u2726 \u2726 \u2726</p>
${textToHtml(ch.content, { dropCap: true })}`;
    const children: { id: string; title: string }[] = [];
    if (ch.subchapters?.length) {
      ch.subchapters.forEach((sub, j) => {
        const subId = `${chId}_sub${j + 1}`;
        children.push({ id: subId, title: sub.title });
        body += `\n<h2 id="${subId}">${escapeXml(sub.title)}</h2>\n${textToHtml(sub.content)}`;
      });
    }
    entries.push({
      id: chId, filename: `${chId}.xhtml`, title: displayTitle, body, children,
      landmark: i === 0 ? "bodymatter" : undefined,
    });
  });

  // --- Back Matter ---
  if (backMatter) {
    const bmSections: [string, string, string | undefined][] = [
      ["conclusion", bmLabels.conclusion, backMatter.conclusion],
      ["authornote", bmLabels.authorNote, backMatter.authorNote],
      ["cta", bmLabels.callToAction, backMatter.callToAction],
      ["review", bmLabels.reviewRequest, backMatter.reviewRequest],
      ["otherbooks", bmLabels.otherBooks, backMatter.otherBooks],
    ];
    for (const [id, title, content] of bmSections) {
      if (content) {
        entries.push({
          id, filename: `${id}.xhtml`, title,
          body: `<h1>${escapeXml(title)}</h1>\n${textToHtml(content)}`,
        });
      }
    }
  }

  // --- Build visible TOC page with clickable links ---
  const tocBodyLines: string[] = [`<h1>${escapeXml(tocLabel)}</h1>`, `<ul class="toc-list">`];
  for (const e of entries) {
    if (e.id === "cover") continue;
    tocBodyLines.push(`<li><a href="${e.filename}">${escapeXml(e.title)}</a></li>`);
    if (e.children) {
      for (const c of e.children) {
        tocBodyLines.push(`<li class="sub"><a href="${e.filename}#${c.id}">${escapeXml(c.title)}</a></li>`);
      }
    }
  }
  tocBodyLines.push(`</ul>`);

  const tocEntry: ContentEntry = {
    id: "toc-page", filename: "toc-page.xhtml", title: tocLabel,
    body: tocBodyLines.join("\n"),
    landmark: "toc",
  };
  entries.splice(tocPageIndex, 0, tocEntry);

  // === Build EPUB files ===
  interface EpubFile { path: string; content: string; binary?: boolean }
  const files: EpubFile[] = [];

  // mimetype (must be first, uncompressed)
  files.push({ path: "mimetype", content: "application/epub+zip" });

  // container.xml
  files.push({
    path: "META-INF/container.xml",
    content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  });

  // stylesheet
  files.push({ path: "OEBPS/style.css", content: STYLESHEET });

  // cover image
  let coverManifest = "";
  let coverMeta = "";
  if (coverDataUrl) {
    const base64 = coverDataUrl.split(",")[1];
    files.push({ path: "OEBPS/cover.jpg", content: base64, binary: true });
    coverManifest = `<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>`;
    coverMeta = `<meta name="cover" content="cover-image"/>`;
  }

  // content XHTML files + manifest/spine
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  for (const e of entries) {
    files.push({ path: `OEBPS/${e.filename}`, content: createXhtml(e.title, e.body) });
    manifestItems.push(`<item id="${e.id}" href="${e.filename}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${e.id}"/>`);
  }

  // --- nav.xhtml (EPUB3 structural navigation — NOT in spine, only in manifest) ---
  const navOl: string[] = [];
  for (const e of entries) {
    if (e.id === "cover") continue;
    if (e.children?.length) {
      navOl.push(`<li><a href="${e.filename}">${escapeXml(e.title)}</a><ol>`);
      for (const c of e.children) {
        navOl.push(`<li><a href="${e.filename}#${c.id}">${escapeXml(c.title)}</a></li>`);
      }
      navOl.push(`</ol></li>`);
    } else {
      navOl.push(`<li><a href="${e.filename}">${escapeXml(e.title)}</a></li>`);
    }
  }

  // Landmarks navigation (required for Kindle)
  const landmarkItems: string[] = [];
  for (const e of entries) {
    if (e.landmark) {
      landmarkItems.push(`<li><a epub:type="${e.landmark}" href="${e.filename}">${escapeXml(e.title)}</a></li>`);
    }
  }

  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${langCode}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(tocLabel)}</title>
</head>
<body>
<nav epub:type="toc" id="toc-nav">
  <h1>${escapeXml(tocLabel)}</h1>
  <ol>
${navOl.join("\n")}
  </ol>
</nav>
<nav epub:type="landmarks" id="landmarks" hidden="">
  <h2>Landmarks</h2>
  <ol>
${landmarkItems.join("\n")}
  </ol>
</nav>
</body>
</html>`;
  files.push({ path: "OEBPS/nav.xhtml", content: navXhtml });
  manifestItems.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`);

  // --- toc.ncx (EPUB2 / Kindle backward compatibility) ---
  let navPointOrder = 1;
  const ncxPoints: string[] = [];
  for (const e of entries) {
    if (e.id === "cover") continue;
    ncxPoints.push(`<navPoint id="np-${navPointOrder}" playOrder="${navPointOrder}"><navLabel><text>${escapeXml(e.title)}</text></navLabel><content src="${e.filename}"/>`);
    if (e.children?.length) {
      for (const c of e.children) {
        navPointOrder++;
        ncxPoints.push(`  <navPoint id="np-${navPointOrder}" playOrder="${navPointOrder}"><navLabel><text>${escapeXml(c.title)}</text></navLabel><content src="${e.filename}#${c.id}"/></navPoint>`);
      }
    }
    ncxPoints.push(`</navPoint>`);
    navPointOrder++;
  }

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(config.title)}</text></docTitle>
  <navMap>
    ${ncxPoints.join("\n    ")}
  </navMap>
</ncx>`;
  files.push({ path: "OEBPS/toc.ncx", content: ncx });
  manifestItems.push(`<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`);

  // --- Kindle guide element (maps to Go To menu) ---
  const guideRefs: string[] = [];
  if (coverDataUrl) {
    guideRefs.push(`<reference type="cover" title="Cover" href="cover.xhtml"/>`);
  }
  guideRefs.push(`<reference type="toc" title="${escapeXml(tocLabel)}" href="toc-page.xhtml"/>`);
  const firstChapter = entries.find(e => e.id.startsWith("chapter"));
  if (firstChapter) {
    guideRefs.push(`<reference type="text" title="${escapeXml(firstChapter.title)}" href="${firstChapter.filename}"/>`);
  }

  // --- content.opf ---
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${escapeXml(config.title)}</dc:title>
    <dc:language>${langCode}</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split(".")[0]}Z</meta>
    ${coverMeta}
  </metadata>
  <manifest>
    <item id="css" href="style.css" media-type="text/css"/>
    ${coverManifest}
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
  <guide>
    ${guideRefs.join("\n    ")}
  </guide>
</package>`;
  files.push({ path: "OEBPS/content.opf", content: opf });

  // === ZIP it ===
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const f of files) {
    if (f.binary) {
      const bin = atob(f.content);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      zip.file(f.path, bytes, { compression: f.path === "mimetype" ? "STORE" : "DEFLATE" });
    } else {
      zip.file(f.path, f.content, { compression: f.path === "mimetype" ? "STORE" : "DEFLATE" });
    }
  }
  return await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
}

export function validateEpubStructure(project: BookProject): string[] {
  const errors: string[] = [];
  const { config, chapters, frontMatter, backMatter } = project;

  // 1. Content completeness
  if (chapters.length === 0) errors.push("No chapters generated yet.");
  chapters.forEach((ch, i) => {
    if (!ch.content || ch.content.length === 0) errors.push(`Chapter ${i + 1} has no content.`);
    if (!ch.title) errors.push(`Chapter ${i + 1} has no title.`);
  });
  if (!frontMatter) errors.push("Front matter not generated.");
  if (!backMatter) errors.push("Back matter not generated.");

  // 2. Build file→anchor map matching the generator
  const fileAnchors = new Map<string, Set<string>>();
  const addAnchor = (filename: string, id: string) => {
    if (!fileAnchors.has(filename)) fileAnchors.set(filename, new Set());
    fileAnchors.get(filename)!.add(id);
  };

  addAnchor("halftitle.xhtml", "halftitle");
  addAnchor("titlepage.xhtml", "titlepage");

  if (frontMatter) {
    const fmMap: [string, string | undefined][] = [
      ["copyright", frontMatter.copyright],
      ["dedication", frontMatter.dedication],
      ["aboutauthor", frontMatter.aboutAuthor],
      ["howtouse", frontMatter.howToUse],
      ["letter", frontMatter.letterToReader],
    ];
    for (const [id, content] of fmMap) {
      if (content) addAnchor(`${id}.xhtml`, id);
    }
  }

  addAnchor("toc-page.xhtml", "toc-page");

  chapters.forEach((ch, i) => {
    const chId = `chapter${i + 1}`;
    const filename = `${chId}.xhtml`;
    addAnchor(filename, chId);
    ch.subchapters?.forEach((_, j) => {
      addAnchor(filename, `${chId}_sub${j + 1}`);
    });
  });

  if (backMatter) {
    const bmMap: [string, string | undefined][] = [
      ["conclusion", backMatter.conclusion],
      ["authornote", backMatter.authorNote],
      ["cta", backMatter.callToAction],
      ["review", backMatter.reviewRequest],
      ["otherbooks", backMatter.otherBooks],
    ];
    for (const [id, content] of bmMap) {
      if (content) addAnchor(`${id}.xhtml`, id);
    }
  }

  // 3. Build TOC links and cross-check
  const tocLinks: { filename: string; label: string }[] = [];

  tocLinks.push({ filename: "titlepage.xhtml", label: "Title Page" });

  if (frontMatter) {
    const fmIds: [string, string | undefined][] = [
      ["copyright", frontMatter.copyright], ["dedication", frontMatter.dedication],
      ["aboutauthor", frontMatter.aboutAuthor], ["howtouse", frontMatter.howToUse],
      ["letter", frontMatter.letterToReader],
    ];
    for (const [id, content] of fmIds) {
      if (content) tocLinks.push({ filename: `${id}.xhtml`, label: id });
    }
  }

  chapters.forEach((ch, i) => {
    const chId = `chapter${i + 1}`;
    tocLinks.push({ filename: `${chId}.xhtml`, label: formatChapterDisplayTitle(i, ch.title, {
      config,
      summary: project.blueprint?.chapterOutlines?.[i]?.summary,
      totalChapters: config.numberOfChapters,
    }) });
  });

  if (backMatter) {
    const bmIds: [string, string | undefined][] = [
      ["conclusion", backMatter.conclusion], ["authornote", backMatter.authorNote],
      ["cta", backMatter.callToAction], ["review", backMatter.reviewRequest],
      ["otherbooks", backMatter.otherBooks],
    ];
    for (const [id, content] of bmIds) {
      if (content) tocLinks.push({ filename: `${id}.xhtml`, label: id });
    }
  }

  // 4. Validate every TOC link resolves
  for (const link of tocLinks) {
    if (!fileAnchors.has(link.filename)) {
      errors.push(`TOC link broken: file "${link.filename}" does not exist (link: "${link.label}")`);
    }
  }

  // 5. Check for duplicate IDs across all files
  const allIds = new Set<string>();
  for (const [, anchors] of fileAnchors) {
    for (const id of anchors) {
      if (allIds.has(id)) errors.push(`Duplicate anchor ID across files: ${id}`);
      allIds.add(id);
    }
  }

  return errors;
}

export function downloadEpub(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".epub") ? filename : `${filename}.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
