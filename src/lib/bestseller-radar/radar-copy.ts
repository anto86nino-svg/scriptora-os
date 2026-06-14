import type { RadarConfidence, RadarDataMode } from "./types";

export function isItalianLanguage(language?: string): boolean {
  return String(language || "").toLowerCase().includes("ital");
}

export function honestyBadgeLabel(mode: RadarDataMode, italian: boolean): string {
  const labels: Record<RadarDataMode, { it: string; en: string }> = {
    "project-based": { it: "Basato sul progetto", en: "Project-based" },
    "analysis-based": { it: "Basato su analisi KDP", en: "KDP analysis-based" },
    estimated: { it: "Stimato", en: "Estimated" },
    demo: { it: "Demo", en: "Demo" },
    unavailable: { it: "Non disponibile", en: "Unavailable" },
  };
  return italian ? labels[mode].it : labels[mode].en;
}

export function confidenceLabel(confidence: RadarConfidence, italian: boolean): string {
  const map = italian
    ? { high: "Affidabilità alta", medium: "Affidabilità media", low: "Affidabilità bassa" }
    : { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
  return map[confidence];
}

export function potentialTier(overall: number, italian: boolean): string {
  if (overall >= 80) return italian ? "Potenziale forte" : "Strong potential";
  if (overall >= 65) return italian ? "Potenziale alto" : "High potential";
  if (overall >= 50) return italian ? "Potenziale medio" : "Medium potential";
  return italian ? "Potenziale debole" : "Weak potential";
}

export function mapRowLabels(italian: boolean): Record<string, string> {
  return italian
    ? {
        hookStrength: "HOOK",
        titlePower: "TITOLO",
        marketFit: "MERCATO",
        booktokPotential: "BOOKTOK",
        kdpPositioning: "KDP FIT",
        publishReadiness: "READINESS",
        overall: "OVERALL",
      }
    : {
        hookStrength: "HOOK",
        titlePower: "TITLE",
        marketFit: "MARKET",
        booktokPotential: "BOOKTOK",
        kdpPositioning: "KDP FIT",
        publishReadiness: "READINESS",
        overall: "OVERALL",
      };
}

export function formatScanTime(iso: string, italian: boolean): string {
  try {
    const d = new Date(iso);
    const time = d.toLocaleTimeString(italian ? "it-IT" : "en-US", { hour: "2-digit", minute: "2-digit" });
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return italian ? `oggi alle ${time}` : `today at ${time}`;
    return d.toLocaleString(italian ? "it-IT" : "en-US");
  } catch {
    return iso;
  }
}
