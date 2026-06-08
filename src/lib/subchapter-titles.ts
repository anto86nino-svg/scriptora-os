/**
 * Content-derived subchapter titles — no generic beat placeholders when summary exists.
 */

function clean(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function capitalize(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function splitSentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 12);
}

function phraseFromText(text: string): string {
  const stripped = clean(text)
    .replace(/^(?:in this section|this section|questa sezione|focus this section on)\s+/i, "")
    .replace(/^(?:explores|explore|covers|cover|analizza|esplora)\s+/i, "")
    .trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length < 3) return "";
  return capitalize(words.slice(0, Math.min(7, words.length)).join(" ").replace(/[,;:]+$/g, ""));
}

export function deriveSubchapterTitle(
  chapterTitle: string,
  chapterSummary: string,
  subIndex: number,
  subSummary?: string,
  totalSubs = 3,
  language = "English",
): string {
  const italian = String(language).toLowerCase().includes("ital");
  const subText = clean(subSummary);
  if (subText && !/^focus this section/i.test(subText)) {
    const fromSub = phraseFromText(subText);
    if (fromSub) return fromSub.slice(0, 72);
  }

  const sentences = splitSentences(chapterSummary);
  if (sentences.length > 0) {
    const sentence = sentences[subIndex % sentences.length];
    const fromSentence = phraseFromText(sentence);
    if (fromSentence) return fromSentence.slice(0, 72);
  }

  const chapterWords = clean(chapterTitle).split(/\s+/).filter((w) => w.length > 3);
  const anchor = chapterWords.slice(0, 2).join(" ") || clean(chapterTitle);
  const beats = italian
    ? ["L'inizio", "La pressione", "La scelta", "La conseguenza", "La rivelazione", "La svolta"]
    : ["The Opening", "The Pressure", "The Choice", "The Consequence", "The Revelation", "The Turn"];

  if (totalSubs <= 1) return capitalize(anchor);
  return capitalize(`${anchor}: ${beats[subIndex % beats.length]}`);
}
