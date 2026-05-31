/** Shared scene splitting for purpose analysis and micro-rewrite. */
export function splitScenesForRewrite(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const byBreak = normalized.split(/\n\s*(?:---|\*\*\*|—{3,})\s*\n/);
  if (byBreak.length > 1) return byBreak.map(s => s.trim()).filter(Boolean);

  const paragraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return [normalized];

  if (paragraphs.every(p => p.split(/\s+/).length >= 8)) {
    return paragraphs;
  }

  const scenes: string[] = [];
  let buffer: string[] = [];

  for (const para of paragraphs) {
    const isShift =
      /^(scene|scena|capitolo|chapter|\d+\.|\[)/i.test(para) ||
      /^(later|poi|the next|il giorno dopo|hours later|ore dopo)/i.test(para);

    if (isShift && buffer.length) {
      scenes.push(buffer.join("\n\n"));
      buffer = [para];
    } else {
      buffer.push(para);
    }
  }
  if (buffer.length) scenes.push(buffer.join("\n\n"));

  return scenes.length ? scenes : [normalized];
}

export function isSubstantiveScene(wordCount: number): boolean {
  return wordCount >= 18;
}
