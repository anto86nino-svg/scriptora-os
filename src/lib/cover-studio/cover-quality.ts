import type { CoverDataMode } from "./cover-types";
import { isItalianLanguage } from "./cover-brief";

export function buildHonestyBadge(
  mode: CoverDataMode,
  language?: string,
): { label: string; detail: string } {
  const italian = isItalianLanguage(language);

  if (mode === "upload") {
    return italian
      ? { label: "Immagine caricata", detail: "Cover basata su upload utente." }
      : { label: "Uploaded image", detail: "Cover based on user upload." };
  }
  if (mode === "ai-assisted") {
    return italian
      ? {
          label: "AI-assisted · Concept",
          detail: "Sfondo generato da Scriptora (procedurale). Titolo/autore editabili. Non è wrap paperback completo.",
        }
      : {
          label: "AI-assisted · Concept",
          detail: "Scriptora procedural background. Title/author editable. Not a full paperback wrap.",
        };
  }
  return italian
    ? {
        label: "Template-based preview",
        detail: "Anteprima template Canvas. Concept cover — non file KDP print-ready finale.",
      }
    : {
        label: "Template-based preview",
        detail: "Canvas template preview. Concept cover — not final KDP print-ready file.",
      };
}
