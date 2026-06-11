import type { BookTypeFamily } from "./types";

export function buildSubchapterEnginePromptBlock(
  family: BookTypeFamily,
  count: number,
  language = "Italian",
): string {
  if (count <= 0) return "No subchapters for this book type.";

  const base = `REAL SUBCHAPTER ENGINE — exactly ${count} subchapters per chapter.
Subchapters MUST derive from real topics in the chapter summary. NO template labels like "Parte 1", "Introduzione", "Sviluppo".`;

  switch (family) {
    case "cookbook":
      return `${base}
Each subchapter = one recipe OR one technique cluster with: nome piatto/tecnica, ingredienti chiave, procedura distinta.
Language: ${language}.`;
    case "educational":
      return `${base}
Each subchapter = one teachable unit: concetto, definizione, esempio, esercizio o periodo storico specifico.
Titles must name the topic (e.g. "Teorema di Pitagora e Applicazioni", not "Lezione 1").
Language: ${language}.`;
    case "manual":
      return `${base}
Each subchapter = one procedure, configuration block, troubleshooting cluster, or tool feature.
Language: ${language}.`;
    case "nonfiction":
      return `${base}
Each subchapter = one framework step, case study, diagnostic question, or actionable protocol.
Language: ${language}.`;
    case "poetry":
      return `${base}
Subchapters = thematic movements or poem clusters with distinct emotional register.
Language: ${language}.`;
    default:
      return `${base}
Each subchapter = one scene beat, POV shift, revelation, or dramatic turn — never a decorative split.
Language: ${language}.`;
  }
}
