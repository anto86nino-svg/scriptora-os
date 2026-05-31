export function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function splitScenes(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(Boolean);
}

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

export function openingWords(text: string, max = 120): string {
  return text.split(/\s+/).slice(0, max).join(" ");
}

export function endingChars(text: string, max = 320): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function joinScenes(scenes: string[]): string {
  return scenes.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isImportantScene(scene: string, index: number, total: number): boolean {
  if (index === 0 || index === total - 1) return true;
  if (/\?/.test(scene)) return true;
  if (/"[^"]+"/.test(scene)) return true;
  if (/\b(promised|secret|truth|danger|forbidden|love|blood|key|phone|door)\b/i.test(scene)) return true;
  return scene.split(/\s+/).length >= 40;
}
