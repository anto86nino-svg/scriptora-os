import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import JSZip from "jszip";
import { validateEpubBuffer } from "../../scripts/validate-epub.mjs";

type FixtureOptions = {
  mimetypeCompression?: "STORE" | "DEFLATE";
  mimetypeValue?: string;
  mimetypeFirst?: boolean;
  includeContainer?: boolean;
  includeNavProperty?: boolean;
  chapterHref?: string;
  spineIdref?: string;
  chapterXhtml?: string;
};

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function buildFixture(options: FixtureOptions = {}): Promise<Buffer> {
  const {
    mimetypeCompression = "STORE",
    mimetypeValue = "application/epub+zip",
    mimetypeFirst = true,
    includeContainer = true,
    includeNavProperty = true,
    chapterHref = "chapter.xhtml",
    spineIdref = "chapter",
    chapterXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter</title></head><body><h1 id="chapter">Chapter</h1><p>Text.</p></body></html>`,
  } = options;
  const zip = new JSZip();

  const addMimetype = () => zip.file("mimetype", mimetypeValue, { compression: mimetypeCompression });
  if (mimetypeFirst) addMimetype();
  if (includeContainer) {
    zip.file("META-INF/container.xml", `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`);
  } else {
    zip.file("META-INF/placeholder.txt", "missing container");
  }
  if (!mimetypeFirst) addMimetype();

  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:test</dc:identifier><dc:title>Test</dc:title><dc:language>it</dc:language></metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"${includeNavProperty ? ` properties="nav"` : ""}/>
    <item id="chapter" href="${chapterHref}" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="${spineIdref}"/></spine>
</package>`);
  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>TOC</title></head><body>
  <nav epub:type="toc"><ol><li><a href="chapter.xhtml#chapter">Chapter</a></li></ol></nav>
</body></html>`);
  zip.file("OEBPS/chapter.xhtml", chapterXhtml);

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

describe("EPUB CLI validator", () => {
  it("accepts a structurally valid EPUB", async () => {
    const report = await validateEpubBuffer(await buildFixture(), { filePath: "valid.epub" });

    expect(report.valid).toBe(true);
    expect(report.summary.failed).toBe(0);
    expect(report.package).toMatchObject({
      opfPath: "OEBPS/content.opf",
      navPath: "OEBPS/nav.xhtml",
    });
    expect(report.summary).toMatchObject({ manifestItems: 2, spineItems: 1, xhtmlFiles: 2 });
  });

  it("rejects mimetype when it is not first, stored, and exact", async () => {
    const report = await validateEpubBuffer(await buildFixture({
      mimetypeFirst: false,
      mimetypeCompression: "DEFLATE",
      mimetypeValue: "application/epub+zip\n",
    }));
    const failed = report.checks.filter((check) => check.status === "fail").map((check) => check.id);

    expect(report.valid).toBe(false);
    expect(failed).toEqual(expect.arrayContaining(["mimetype.first", "mimetype.stored", "mimetype.value"]));
  });

  it("rejects an EPUB without META-INF/container.xml", async () => {
    const report = await validateEpubBuffer(await buildFixture({ includeContainer: false }));

    expect(report.valid).toBe(false);
    expect(report.checks).toContainEqual(expect.objectContaining({ id: "container.exists", status: "fail" }));
  });

  it("reports broken manifest, spine, nav, and malformed XHTML", async () => {
    const report = await validateEpubBuffer(await buildFixture({
      includeNavProperty: false,
      chapterHref: "missing.xhtml",
      spineIdref: "ghost",
      chapterXhtml: `<html xmlns="http://www.w3.org/1999/xhtml"><body><p></body></html>`,
    }));
    const failed = report.checks.filter((check) => check.status === "fail").map((check) => check.id);

    expect(report.valid).toBe(false);
    expect(failed).toEqual(expect.arrayContaining([
      "manifest.href.exists",
      "spine.idref",
      "nav.manifest",
    ]));
  });

  it("rejects malformed XHTML referenced by the manifest", async () => {
    const report = await validateEpubBuffer(await buildFixture({
      chapterXhtml: `<html xmlns="http://www.w3.org/1999/xhtml"><body><p></body></html>`,
    }));

    expect(report.valid).toBe(false);
    expect(report.checks).toContainEqual(expect.objectContaining({
      id: "xhtml.parse",
      status: "fail",
      details: expect.objectContaining({ path: "OEBPS/chapter.xhtml" }),
    }));
  });

  it("returns CLI exit codes and writes the optional JSON report", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "scriptora-epub-validator-"));
    tempDirectories.push(directory);
    const epubPath = path.join(directory, "book.epub");
    const reportPath = path.join(directory, "report.json");
    await writeFile(epubPath, await buildFixture());

    const scriptPath = path.resolve(process.cwd(), "scripts/validate-epub.mjs");
    const validRun = spawnSync(process.execPath, [scriptPath, epubPath, "--json-file", reportPath], {
      encoding: "utf8",
    });
    const savedReport = JSON.parse(await readFile(reportPath, "utf8"));

    expect(validRun.status).toBe(0);
    expect(savedReport.valid).toBe(true);

    await writeFile(epubPath, await buildFixture({ includeContainer: false }));
    const invalidRun = spawnSync(process.execPath, [scriptPath, epubPath, "--json"], {
      encoding: "utf8",
    });

    expect(invalidRun.status).toBe(1);
    expect(JSON.parse(invalidRun.stdout)).toMatchObject({ valid: false });
  });
});
