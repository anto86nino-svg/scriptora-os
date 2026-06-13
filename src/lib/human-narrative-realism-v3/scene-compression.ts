/** Light compression when a paragraph is pure emotion tell with no scene function. */

const TELL_ONLY: RegExp =
  /^(?:Era|Erano|Si sentiva|Mi sentivo|I felt|She felt|He felt|Provava|Provò)\s+[^.\n]{8,90}[.!?…]?\s*$/gim;

const ACTION_SIGNAL =
  /\b(disse|chiese|risposte|mentì|partì|arrivò|aprì|chiuse|corse|guardò|prese|lasciò|said|asked|left|opened|closed|ran|looked|took|grabbed|walked)\b/i;

export function compressEmotionOnlyParagraphs(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  let compressed = 0;

  const rebuilt = paragraphs.map((paragraph) => {
    if (compressed >= 1 || paragraph.length < 120) return paragraph;
    if (ACTION_SIGNAL.test(paragraph)) return paragraph;

    const tells = paragraph.match(TELL_ONLY);
    if (!tells || tells.length < 2) return paragraph;

    const trimmed = paragraph.replace(TELL_ONLY, "").trim();
    if (trimmed.length < paragraph.length * 0.4) {
      compressed += 1;
      return trimmed || paragraph.split(/[.!?]/)[0]?.trim() + ".";
    }
    return paragraph;
  });

  return rebuilt.join("\n\n");
}
