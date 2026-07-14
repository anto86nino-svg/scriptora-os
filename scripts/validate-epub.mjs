#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import { JSDOM } from "jsdom";

const EPUB_MIMETYPE = "application/epub+zip";
const CONTAINER_PATH = "META-INF/container.xml";
const PACKAGE_MEDIA_TYPE = "application/oebps-package+xml";
const XHTML_MEDIA_TYPE = "application/xhtml+xml";
const EPUB_NAMESPACE = "http://www.idpf.org/2007/ops";

function createReport(filePath) {
  return {
    schemaVersion: 1,
    file: filePath ? path.resolve(filePath) : null,
    valid: false,
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0,
      archiveFiles: 0,
      manifestItems: 0,
      spineItems: 0,
      xhtmlFiles: 0,
    },
    package: {
      containerPath: CONTAINER_PATH,
      opfPath: null,
      navPath: null,
    },
    checks: [],
  };
}

function addCheck(report, id, status, message, details) {
  const check = { id, status, message };
  if (details && Object.keys(details).length > 0) check.details = details;
  report.checks.push(check);
  if (status === "pass") report.summary.passed += 1;
  if (status === "fail") report.summary.failed += 1;
  if (status === "warning") report.summary.warnings += 1;
}

function finalizeReport(report) {
  report.valid = report.summary.failed === 0;
  return report;
}

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("End of central directory ZIP non trovato.");
}

function inspectZipHeaders(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buffer.length < 30 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("Il file non inizia con un local file header ZIP valido.");
  }

  const firstNameLength = buffer.readUInt16LE(26);
  const firstExtraLength = buffer.readUInt16LE(28);
  const firstNameEnd = 30 + firstNameLength;
  if (firstNameEnd + firstExtraLength > buffer.length) {
    throw new Error("Local file header ZIP troncato.");
  }

  const firstEntry = {
    name: buffer.subarray(30, firstNameEnd).toString("utf8"),
    compressionMethod: buffer.readUInt16LE(8),
    extraLength: firstExtraLength,
    localHeaderOffset: 0,
  };

  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (entryCount === 0xffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error("ZIP64 non supportato dal validatore EPUB.");
  }

  const entries = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Central directory ZIP non valida all'elemento ${index + 1}.`);
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    if (nameEnd + extraLength + commentLength > buffer.length) {
      throw new Error(`Central directory ZIP troncata all'elemento ${index + 1}.`);
    }
    entries.push({
      name: buffer.subarray(nameStart, nameEnd).toString("utf8"),
      compressionMethod: buffer.readUInt16LE(offset + 10),
      localHeaderOffset,
    });
    offset = nameEnd + extraLength + commentLength;
  }

  const mimetypeEntry = entries.find((entry) => entry.name === "mimetype") || null;
  if (mimetypeEntry) {
    const localOffset = mimetypeEntry.localHeaderOffset;
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("Local file header di mimetype non valido.");
    }
    mimetypeEntry.localCompressionMethod = buffer.readUInt16LE(localOffset + 8);
    mimetypeEntry.localExtraLength = buffer.readUInt16LE(localOffset + 28);
  }

  return { firstEntry, entries, mimetypeEntry };
}

function parseXml(text, contentType, label) {
  try {
    return new JSDOM(text, { contentType, url: "https://epub.local/" }).window.document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} non è XML valido: ${message}`);
  }
}

function elementsByLocalName(document, localName) {
  return Array.from(document.getElementsByTagName("*")).filter(
    (element) => element.localName === localName,
  );
}

function safeDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isExternalReference(href) {
  return /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//");
}

function resolveArchiveReference(baseFile, href) {
  const raw = String(href || "").trim();
  if (!raw || isExternalReference(raw)) return null;
  if (raw.includes("\\")) throw new Error(`Riferimento ZIP non valido: ${raw}`);

  const hashIndex = raw.indexOf("#");
  const queryIndex = raw.indexOf("?");
  const cutIndexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const cutAt = cutIndexes.length ? Math.min(...cutIndexes) : raw.length;
  const rawPath = raw.slice(0, cutAt);
  const fragment = hashIndex >= 0 ? safeDecodeUriComponent(raw.slice(hashIndex + 1)) : "";
  const decodedPath = safeDecodeUriComponent(rawPath);
  const baseDir = path.posix.dirname(baseFile);
  const resolvedPath = rawPath
    ? path.posix.normalize(path.posix.join(baseDir, decodedPath))
    : baseFile;

  if (
    !resolvedPath
    || resolvedPath === "."
    || path.posix.isAbsolute(decodedPath)
    || resolvedPath === ".."
    || resolvedPath.startsWith("../")
  ) {
    throw new Error(`Riferimento fuori dall'archivio: ${raw}`);
  }

  return { path: resolvedPath, fragment };
}

function archiveFile(zip, archivePath) {
  const entry = zip.file(archivePath);
  return entry && !entry.dir ? entry : null;
}

async function readArchiveText(zip, archivePath) {
  const entry = archiveFile(zip, archivePath);
  if (!entry) throw new Error(`File mancante nell'archivio: ${archivePath}`);
  return entry.async("string");
}

function checkPass(report, id, message, details) {
  addCheck(report, id, "pass", message, details);
}

function checkFail(report, id, message, details) {
  addCheck(report, id, "fail", message, details);
}

export async function validateEpubBuffer(input, options = {}) {
  const report = createReport(options.filePath || null);
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  let headers;
  try {
    headers = inspectZipHeaders(buffer);
    checkPass(report, "zip.headers", "Header ZIP e central directory leggibili.");
  } catch (error) {
    checkFail(report, "zip.headers", error instanceof Error ? error.message : String(error));
    return finalizeReport(report);
  }

  if (headers.firstEntry.name === "mimetype") {
    checkPass(report, "mimetype.first", "mimetype è il primo file fisico del ZIP.");
  } else {
    checkFail(report, "mimetype.first", "mimetype non è il primo file fisico del ZIP.", {
      firstEntry: headers.firstEntry.name,
    });
  }

  if (!headers.mimetypeEntry) {
    checkFail(report, "mimetype.entry", "File mimetype mancante.");
  } else {
    checkPass(report, "mimetype.entry", "File mimetype presente.");
    const stored = headers.mimetypeEntry.compressionMethod === 0
      && headers.mimetypeEntry.localCompressionMethod === 0;
    if (stored) {
      checkPass(report, "mimetype.stored", "mimetype è memorizzato senza compressione (STORE).");
    } else {
      checkFail(report, "mimetype.stored", "mimetype usa un metodo di compressione non consentito.", {
        centralMethod: headers.mimetypeEntry.compressionMethod,
        localMethod: headers.mimetypeEntry.localCompressionMethod,
      });
    }
    if (headers.mimetypeEntry.localExtraLength === 0) {
      checkPass(report, "mimetype.extra", "Il local header di mimetype non contiene extra field.");
    } else {
      checkFail(report, "mimetype.extra", "Il local header di mimetype contiene un extra field non consentito.", {
        extraLength: headers.mimetypeEntry.localExtraLength,
      });
    }
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
    report.summary.archiveFiles = Object.values(zip.files).filter((entry) => !entry.dir).length;
    checkPass(report, "zip.load", "Archivio aperto con JSZip e CRC verificati.", {
      files: report.summary.archiveFiles,
    });
  } catch (error) {
    checkFail(report, "zip.load", `JSZip non riesce ad aprire l'archivio: ${error instanceof Error ? error.message : String(error)}`);
    return finalizeReport(report);
  }

  const mimetypeFile = archiveFile(zip, "mimetype");
  if (mimetypeFile) {
    const mimetypeValue = await mimetypeFile.async("string");
    if (mimetypeValue === EPUB_MIMETYPE) {
      checkPass(report, "mimetype.value", `Valore mimetype esatto: ${EPUB_MIMETYPE}.`);
    } else {
      checkFail(report, "mimetype.value", "Valore mimetype non valido.", {
        expected: EPUB_MIMETYPE,
        actual: mimetypeValue,
      });
    }
  }

  const containerEntry = archiveFile(zip, CONTAINER_PATH);
  if (!containerEntry) {
    checkFail(report, "container.exists", `${CONTAINER_PATH} mancante.`);
    return finalizeReport(report);
  }
  checkPass(report, "container.exists", `${CONTAINER_PATH} presente.`);

  let containerDocument;
  try {
    containerDocument = parseXml(await containerEntry.async("string"), "application/xml", CONTAINER_PATH);
    checkPass(report, "container.parse", `${CONTAINER_PATH} è XML parseabile.`);
  } catch (error) {
    checkFail(report, "container.parse", error instanceof Error ? error.message : String(error));
    return finalizeReport(report);
  }

  const rootfiles = elementsByLocalName(containerDocument, "rootfile");
  if (rootfiles.length === 0) {
    checkFail(report, "container.rootfile", "container.xml non dichiara alcun rootfile OPF.");
    return finalizeReport(report);
  }

  const preferredRootfile = rootfiles.find(
    (element) => element.getAttribute("media-type") === PACKAGE_MEDIA_TYPE,
  ) || rootfiles[0];
  const opfPath = path.posix.normalize(preferredRootfile.getAttribute("full-path") || "");
  if (!opfPath || opfPath === "." || opfPath === ".." || opfPath.startsWith("../") || path.posix.isAbsolute(opfPath)) {
    checkFail(report, "container.rootfile", "Il full-path del rootfile OPF non è valido.", { opfPath });
    return finalizeReport(report);
  }
  report.package.opfPath = opfPath;
  checkPass(report, "container.rootfile", "Rootfile OPF dichiarato nel container.", { opfPath });

  const opfEntry = archiveFile(zip, opfPath);
  if (!opfEntry) {
    checkFail(report, "opf.exists", "Il file OPF dichiarato nel container non esiste.", { opfPath });
    return finalizeReport(report);
  }
  checkPass(report, "opf.exists", "File OPF presente.", { opfPath });

  let opfDocument;
  try {
    opfDocument = parseXml(await opfEntry.async("string"), "application/xml", opfPath);
    checkPass(report, "opf.parse", "OPF XML parseabile.", { opfPath });
  } catch (error) {
    checkFail(report, "opf.parse", error instanceof Error ? error.message : String(error), { opfPath });
    return finalizeReport(report);
  }

  if (opfDocument.documentElement?.localName !== "package") {
    checkFail(report, "opf.package", "La radice OPF non è <package>.");
  } else {
    checkPass(report, "opf.package", "Radice OPF <package> valida.");
  }

  const manifestElements = elementsByLocalName(opfDocument, "manifest");
  const manifestItems = manifestElements.length
    ? elementsByLocalName(manifestElements[0], "item")
    : [];
  report.summary.manifestItems = manifestItems.length;
  if (manifestItems.length === 0) {
    checkFail(report, "manifest.items", "Manifest OPF vuoto o mancante.");
    return finalizeReport(report);
  }
  checkPass(report, "manifest.items", `Manifest con ${manifestItems.length} elementi.`);

  const manifestById = new Map();
  const manifestRecords = [];
  for (const item of manifestItems) {
    const id = String(item.getAttribute("id") || "").trim();
    const href = String(item.getAttribute("href") || "").trim();
    const mediaType = String(item.getAttribute("media-type") || "").trim();
    const properties = String(item.getAttribute("properties") || "").trim().split(/\s+/).filter(Boolean);

    if (!id || !href || !mediaType) {
      checkFail(report, "manifest.item.fields", "Elemento manifest privo di id, href o media-type.", { id, href, mediaType });
      continue;
    }
    if (manifestById.has(id)) {
      checkFail(report, "manifest.item.id", "ID duplicato nel manifest.", { id });
      continue;
    }

    let resolved;
    try {
      resolved = resolveArchiveReference(opfPath, href);
    } catch (error) {
      checkFail(report, "manifest.href", error instanceof Error ? error.message : String(error), { id, href });
      continue;
    }
    if (!resolved) {
      checkFail(report, "manifest.href", "Href manifest esterno o vuoto non consentito.", { id, href });
      continue;
    }

    const record = { id, href, mediaType, properties, path: resolved.path };
    manifestById.set(id, record);
    manifestRecords.push(record);
    if (archiveFile(zip, resolved.path)) {
      checkPass(report, "manifest.href.exists", "Href manifest risolto.", { id, href, path: resolved.path });
    } else {
      checkFail(report, "manifest.href.exists", "Href manifest punta a un file assente.", { id, href, path: resolved.path });
    }
  }

  const spineElements = elementsByLocalName(opfDocument, "spine");
  const spineItems = spineElements.length
    ? elementsByLocalName(spineElements[0], "itemref")
    : [];
  report.summary.spineItems = spineItems.length;
  if (spineItems.length === 0) {
    checkFail(report, "spine.items", "Spine OPF vuota o mancante.");
  } else {
    checkPass(report, "spine.items", `Spine con ${spineItems.length} elementi.`);
  }

  for (const itemref of spineItems) {
    const idref = String(itemref.getAttribute("idref") || "").trim();
    const manifestItem = manifestById.get(idref);
    if (!idref || !manifestItem) {
      checkFail(report, "spine.idref", "itemref della spine non risolve un elemento del manifest.", { idref });
      continue;
    }
    if (!archiveFile(zip, manifestItem.path)) {
      checkFail(report, "spine.href.exists", "Elemento spine risolve un file assente.", {
        idref,
        path: manifestItem.path,
      });
    } else {
      checkPass(report, "spine.href.exists", "Elemento spine risolve un file esistente.", {
        idref,
        path: manifestItem.path,
      });
    }
  }

  const xhtmlDocuments = new Map();
  const xhtmlItems = manifestRecords.filter((item) => item.mediaType === XHTML_MEDIA_TYPE);
  report.summary.xhtmlFiles = xhtmlItems.length;
  for (const item of xhtmlItems) {
    const entry = archiveFile(zip, item.path);
    if (!entry) continue;
    try {
      const document = parseXml(await entry.async("string"), "application/xhtml+xml", item.path);
      if (document.documentElement?.localName !== "html") {
        throw new Error(`${item.path} non ha una radice <html>.`);
      }
      xhtmlDocuments.set(item.path, document);
      checkPass(report, "xhtml.parse", "XHTML parseabile.", { id: item.id, path: item.path });
    } catch (error) {
      checkFail(report, "xhtml.parse", error instanceof Error ? error.message : String(error), {
        id: item.id,
        path: item.path,
      });
    }
  }

  const navItems = manifestRecords.filter((item) => item.properties.includes("nav"));
  if (navItems.length !== 1) {
    checkFail(report, "nav.manifest", "Il manifest deve contenere esattamente un elemento con properties=nav.", {
      count: navItems.length,
    });
  } else {
    const navItem = navItems[0];
    report.package.navPath = navItem.path;
    if (navItem.mediaType !== XHTML_MEDIA_TYPE) {
      checkFail(report, "nav.media-type", "Il documento nav non usa application/xhtml+xml.", {
        mediaType: navItem.mediaType,
      });
    } else {
      checkPass(report, "nav.media-type", "Media type del documento nav valido.");
    }

    const navDocument = xhtmlDocuments.get(navItem.path);
    if (!navDocument) {
      checkFail(report, "nav.parse", "Documento nav assente o non parseabile.", { path: navItem.path });
    } else {
      const tocNav = elementsByLocalName(navDocument, "nav").find((element) => {
        const type = element.getAttributeNS(EPUB_NAMESPACE, "type")
          || element.getAttribute("epub:type")
          || element.getAttribute("type")
          || "";
        return type.split(/\s+/).includes("toc");
      });
      if (!tocNav) {
        checkFail(report, "nav.toc", "Il documento nav non contiene <nav epub:type=\"toc\">.", { path: navItem.path });
      } else {
        checkPass(report, "nav.toc", "Navigation document contiene il TOC EPUB.", { path: navItem.path });
        for (const anchor of elementsByLocalName(tocNav, "a")) {
          const href = String(anchor.getAttribute("href") || "").trim();
          if (!href || isExternalReference(href)) continue;
          try {
            const resolved = resolveArchiveReference(navItem.path, href);
            if (!resolved || !archiveFile(zip, resolved.path)) {
              checkFail(report, "nav.href.exists", "Link del nav punta a un file assente.", {
                href,
                path: resolved?.path || null,
              });
              continue;
            }
            if (resolved.fragment) {
              const targetDocument = xhtmlDocuments.get(resolved.path);
              if (!targetDocument || !targetDocument.getElementById(resolved.fragment)) {
                checkFail(report, "nav.fragment.exists", "Frammento del nav non trovato nel documento target.", {
                  href,
                  path: resolved.path,
                  fragment: resolved.fragment,
                });
                continue;
              }
            }
            checkPass(report, "nav.href.exists", "Link del nav risolto.", { href, path: resolved.path });
          } catch (error) {
            checkFail(report, "nav.href.exists", error instanceof Error ? error.message : String(error), { href });
          }
        }
      }
    }
  }

  return finalizeReport(report);
}

export async function validateEpubFile(filePath) {
  const report = createReport(filePath);
  if (!filePath || path.extname(filePath).toLowerCase() !== ".epub") {
    checkFail(report, "input.extension", "Il file deve avere estensione .epub.", { filePath: filePath || null });
    return finalizeReport(report);
  }

  try {
    const input = await readFile(filePath);
    return validateEpubBuffer(input, { filePath });
  } catch (error) {
    checkFail(report, "input.read", `Impossibile leggere il file EPUB: ${error instanceof Error ? error.message : String(error)}`);
    return finalizeReport(report);
  }
}

function printHumanReport(report) {
  const outcome = report.valid ? "VALIDO" : "NON VALIDO";
  console.log(`EPUB ${outcome}: ${report.file || "(buffer)"}`);
  console.log(
    `Controlli: ${report.summary.passed} superati, ${report.summary.failed} falliti, ${report.summary.warnings} avvisi.`,
  );
  for (const check of report.checks.filter((item) => item.status !== "pass")) {
    console.error(`[${check.status.toUpperCase()}] ${check.id}: ${check.message}`);
  }
}

function usage() {
  return [
    "Uso: node scripts/validate-epub.mjs <file.epub> [--json] [--json-file <report.json>]",
    "  --json                 stampa il report JSON su stdout",
    "  --json-file <percorso> salva il report JSON nel file indicato",
  ].join("\n");
}

function parseArguments(argv) {
  let filePath = null;
  let jsonStdout = false;
  let jsonFile = null;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument === "--json") {
      jsonStdout = true;
    } else if (argument.startsWith("--json=")) {
      jsonFile = argument.slice("--json=".length);
    } else if (argument === "--json-file") {
      index += 1;
      jsonFile = argv[index] || null;
    } else if (argument.startsWith("-")) {
      throw new Error(`Opzione sconosciuta: ${argument}`);
    } else if (!filePath) {
      filePath = argument;
    } else {
      throw new Error(`Argomento inatteso: ${argument}`);
    }
  }

  if (jsonStdout && jsonFile) throw new Error("Usa --json oppure --json-file, non entrambi.");
  if (jsonFile === "") throw new Error("Percorso report JSON mancante.");
  return { filePath, jsonStdout, jsonFile, help };
}

export async function runCli(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArguments(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage());
    return 2;
  }

  if (args.help) {
    console.log(usage());
    return 0;
  }
  if (!args.filePath) {
    console.error(usage());
    return 2;
  }
  if (args.jsonFile == null && argv.includes("--json-file")) {
    console.error("Percorso report JSON mancante.");
    console.error(usage());
    return 2;
  }

  const report = await validateEpubFile(args.filePath);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.jsonStdout) {
    process.stdout.write(serialized);
  } else {
    printHumanReport(report);
    if (args.jsonFile) {
      await writeFile(path.resolve(args.jsonFile), serialized, "utf8");
      console.log(`Report JSON: ${path.resolve(args.jsonFile)}`);
    }
  }
  return report.valid ? 0 : 1;
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  process.exitCode = await runCli();
}
