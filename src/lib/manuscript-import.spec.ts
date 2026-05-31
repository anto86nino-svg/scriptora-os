import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { htmlToPlainText, readManuscriptFile } from "./manuscript-import";

function mockFile(input: {
  name: string;
  type?: string;
  text?: string;
  buffer?: ArrayBuffer;
}): File {
  return {
    name: input.name,
    type: input.type || "application/octet-stream",
    text: async () => input.text ?? "",
    arrayBuffer: async () => input.buffer ?? new ArrayBuffer(0),
  } as File;
}

describe("manuscript-import", () => {
  it("extracts plain text from HTML", () => {
    const html = `<html><body><h1>Chapter 1</h1><p>First paragraph.</p><p>Second paragraph.</p></body></html>`;
    expect(htmlToPlainText(html)).toContain("Chapter 1");
    expect(htmlToPlainText(html)).toContain("First paragraph.");
    expect(htmlToPlainText(html)).toContain("Second paragraph.");
  });

  it("reads plain text and markdown files", async () => {
    const txt = mockFile({ name: "draft.txt", type: "text/plain", text: "Hello manuscript" });
    await expect(readManuscriptFile(txt, "unsupported")).resolves.toBe("Hello manuscript");

    const md = mockFile({ name: "draft.md", type: "text/markdown", text: "# Title\n\nBody" });
    await expect(readManuscriptFile(md, "unsupported")).resolves.toContain("Body");
  });

  it("reads docx files", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Chapter opener</w:t></w:r></w:p>
    <w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const file = mockFile({
      name: "book.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer,
    });
    const text = await readManuscriptFile(file, "unsupported");
    expect(text).toContain("Chapter opener");
    expect(text).toContain("Second paragraph");
  });

  it("reads epub spine content", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    );
    zip.file(
      "OEBPS/content.opf",
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="c1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
  </spine>
</package>`,
    );
    zip.file(
      "OEBPS/chapter1.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body><p>The forbidden seal cracked.</p><p>Who had moved first?</p></body>
</html>`,
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const file = mockFile({ name: "book.epub", type: "application/epub+zip", buffer });
    const text = await readManuscriptFile(file, "unsupported");
    expect(text).toContain("forbidden seal");
    expect(text).toContain("Who had moved first?");
  });

  it("rejects unknown extensions", async () => {
    const file = mockFile({ name: "notes.pages", type: "application/octet-stream", text: "data" });
    await expect(readManuscriptFile(file, "unsupported")).rejects.toThrow("unsupported");
  });
});
