export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function openingText(text: string, maxWords = 120): string {
  return text.split(/\s+/).slice(0, maxWords).join(" ");
}

export function endingText(text: string, maxChars = 360): string {
  const trimmed = text.trim();
  return trimmed.length <= maxChars ? trimmed : trimmed.slice(-maxChars);
}

export function splitScenes(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 80);
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
