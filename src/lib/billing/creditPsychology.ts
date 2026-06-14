import type { BookLength } from "@/types/book";
import type { CreditOperationId } from "./types";
import { getOperationCost } from "./creditPolicy";
import { formatCredits } from "@/lib/credit-economy";

export interface CreditValuePresentation {
  premiumLabel: string;
  valueHint: string;
  shortLabel: string;
}

const PREMIUM_LABELS: Partial<Record<CreditOperationId, string>> = {
  generate_chapter_short: "✨ Capitolo Pro (breve)",
  generate_chapter_medium: "✨ Chapter Generation Pro",
  generate_chapter_long: "✨ Capitolo Pro (lungo)",
  rewrite_chapter: "🖊️ Rewrite editoriale",
  chapter_diagnostic: "🧠 Editorial Diagnostic",
  fix_chapter: "🔧 Fix chirurgico capitolo",
  auto_bestseller: "🚀 Auto Bestseller Engine",
  market_intelligence: "📊 Market Intelligence Pro",
  kdp_launch: "📦 KDP Launch Suite",
  cover_generation: "🎨 Cover Studio Pro",
  character_studio_ai: "👤 Character Studio AI",
  book_analysis: "📖 Analisi manoscritto",
  export_premium: "📤 Export Premium",
};

const VALUE_HINTS: Partial<Record<CreditOperationId, string>> = {
  generate_chapter_short: "≈ 2 min di scrittura AI premium",
  generate_chapter_medium: "≈ 3–4 min di scrittura AI premium",
  generate_chapter_long: "≈ 6–8 min di scrittura AI premium",
  rewrite_chapter: "Riscrittura profonda con continuità narrativa",
  chapter_diagnostic: "Developmental editor + Story Doctor",
  fix_chapter: "Correzioni mirate senza riscrivere tutto",
  auto_bestseller: "Blueprint bestseller + posizionamento mercato",
  market_intelligence: "Analisi nicchia e potenziale commerciale",
  kdp_launch: "Packaging Amazon + lancio ottimizzato",
  cover_generation: "Copertina commerciale pronta KDP",
  character_studio_ai: "Bible personaggi con memoria profonda",
  book_analysis: "Diagnostica editoriale completa",
  export_premium: "Export professionale pronto pubblicazione",
};

export function getCreditValuePresentation(
  operation: CreditOperationId,
  bookLength?: BookLength,
): CreditValuePresentation {
  const cost = getOperationCost(operation, bookLength);
  const premiumLabel = PREMIUM_LABELS[operation] || "✨ Azione premium";
  const valueHint = VALUE_HINTS[operation] || "Potenza editoriale Scriptora";
  return {
    premiumLabel,
    valueHint,
    shortLabel: `${premiumLabel} · ${formatCredits(cost)} crediti`,
  };
}

export function estimateChaptersRemaining(balance: number, chapterCost = 350): number {
  if (chapterCost <= 0) return 0;
  return Math.floor(balance / chapterCost);
}

export function buildSmartCreditRecommendation(balance: number, chapterCost = 350): string | null {
  const chapters = estimateChaptersRemaining(balance, chapterCost);
  if (chapters >= 5) return null;
  if (chapters >= 1) {
    return `Hai ancora crediti per ~${chapters} capitolo${chapters === 1 ? "" : "i"}. Perfetto per mantenere il momentum.`;
  }
  return "Crediti quasi esauriti — un pack ti permette di finire il manoscritto senza interruzioni.";
}
