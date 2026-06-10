import type { BookConfig } from "@/types/book";
import { normalizeAuthorIdentity } from "@/lib/author-identity";
import { buildAuthorStyleFromPro, defaultBestsellerProConfig } from "@/lib/bestseller-pro-config";

export function buildAuthorDnaBlock(config: BookConfig): string {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  const penName = identity?.penName || config.authorName || config.author || "Author";
  const pro = defaultBestsellerProConfig(config.genre);
  const proStyle = buildAuthorStyleFromPro(pro);

  const lines = [
    "AUTHOR DNA SYSTEM — persistent voice lock:",
    `Pen name: ${penName}`,
    identity?.archetype ? `Archetype: ${identity.archetype}` : "",
    identity?.voice ? `Voice signature: ${identity.voice}` : "",
    identity?.signatureMoves ? `Signature moves: ${identity.signatureMoves}` : "",
    identity?.forbiddenMoves ? `Never do: ${identity.forbiddenMoves}` : "",
    identity?.recurringThemes ? `Recurring themes: ${identity.recurringThemes}` : "",
    config.authorStyle ? `Style lock: ${config.authorStyle}` : "",
    config.tone ? `Tone lock: ${config.tone}` : `Pro style: ${proStyle}`,
    "Every sentence must sound like THIS author — not generic AI, not interchangeable bestseller voice.",
  ].filter(Boolean);

  return lines.join("\n");
}
