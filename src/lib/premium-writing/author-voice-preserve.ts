import type { BookConfig } from "@/types/book";

export function buildAuthorVoicePreserveBlock(config: BookConfig): string {
  return `
AUTHOR VOICE PRESERVE (ABSOLUTE):
All corrections must keep:
- tone: "${config.tone || "as established"}"
- genre: "${config.genre}"
- author style: "${config.authorStyle || "consistent with prior chapters"}"
- language: ${config.language}

Improve the text. Never rewrite into a different voice.
Do not change POV, tense, or narrative distance unless fixing a clear error.
`.trim();
}

export function wrapRetryWithVoicePreserve(config: BookConfig, fixes: string): string {
  return `${buildAuthorVoicePreserveBlock(config)}

SURGICAL FIXES ONLY (do not rewrite from scratch):
${fixes}`;
}
