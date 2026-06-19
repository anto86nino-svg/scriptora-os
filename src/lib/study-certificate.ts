export interface StudyCertificateInput {
  studentName: string;
  subject: string;
  date: string;
  score: number;
  level: string;
  grade10?: number;
  grade30?: number;
  judgement?: string;
  sourceProjectId?: string;
  badges: string[];
}

export async function generateStudyCertificatePdf(input: StudyCertificateInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(12, 18, 32);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(2);
  doc.roundedRect(28, 28, w - 56, h - 56, 12, 12, "S");

  doc.setTextColor(125, 211, 252);
  doc.setFontSize(11);
  doc.text("SCRIPTORA ACADEMY", w / 2, 72, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text("Certificato di Apprendimento", w / 2, 108, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(203, 213, 225);
  doc.text("Si certifica che", w / 2, 150, { align: "center" });

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(input.studentName, w / 2, 182, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(203, 213, 225);
  doc.text(`ha completato con successo lo studio di: ${input.subject}`, w / 2, 214, { align: "center" });
  doc.text(`Data: ${input.date}`, w / 2, 236, { align: "center" });
  doc.text(`Punteggio: ${input.score}/100 · Livello: ${input.level}`, w / 2, 258, { align: "center" });
  if (input.grade10 || input.grade30 || input.judgement) {
    doc.text(
      `Valutazione: ${input.grade10 ?? "-"} /10 · ${input.grade30 ?? "-"} /30 · ${input.judgement || "Giudizio non disponibile"}`,
      w / 2,
      280,
      { align: "center" },
    );
  }

  if (input.badges.length) {
    doc.setFontSize(12);
    doc.text(`Badge: ${input.badges.join(" · ")}`, w / 2, input.grade10 || input.grade30 || input.judgement ? 304 : 282, { align: "center" });
  }

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("Scriptora Study OS — Professional Learning Certificate", w / 2, h - 48, { align: "center" });

  return doc.output("blob");
}

export async function downloadStudyCertificate(input: StudyCertificateInput, filename = "scriptora-certificate.pdf"): Promise<void> {
  const blob = await generateStudyCertificatePdf(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
