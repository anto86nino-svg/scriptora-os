import type { CreditLedgerEntry, CreditOperationId, CreditPlanId, CreditWallet } from "./types";
import { PLAN_CREDIT_ALLOCATION } from "./creditPolicy";
import { isDevUnlimitedCredits } from "./devMode";

export type CreditConsumptionCategory =
  | "chapters"
  | "rewrite"
  | "diagnostic"
  | "cover"
  | "auto_bestseller"
  | "kdp"
  | "export"
  | "fix"
  | "market"
  | "character"
  | "study"
  | "other"
  | "purchases";

export const PLAN_DISPLAY_LABELS: Record<CreditPlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro_author: "Author Pro",
  studio: "Studio",
  publisher: "Publisher",
  student_free: "Student Free",
  student_basic: "Student Basic",
  student_plus: "Student Plus",
  student_pro_exam: "Student Pro Exam",
};

export const OPERATION_DISPLAY_LABELS: Record<string, string> = {
  generate_chapter_short: "Capitolo breve",
  generate_chapter_medium: "Capitolo standard",
  generate_chapter_long: "Capitolo lungo",
  rewrite_chapter: "Riscrivi scena",
  chapter_diagnostic: "Analysis Pro capitolo",
  fix_chapter: "Patch capitolo",
  auto_bestseller: "Bestseller Radar",
  market_intelligence: "Market Intelligence",
  kdp_launch: "KDP Launch analysis",
  cover_generation: "Cover Studio",
  character_studio_ai: "Character Studio AI",
  book_analysis: "Manuscript Analyzer",
  export_premium: "Export premium",
  wizard_title_regeneration: "Rigenerazione titoli",
  book_idea: "Genera idea libro",
  title_domination: "Title Domination",
  blueprint_generation: "Blueprint completo",
  chapter_regenerate: "Rigenera capitolo",
  kdp_narrative_flow: "KDP Narrative Flow",
  cover_variant: "Cover variant extra",
  export_epub: "Export EPUB",
  export_docx: "Export DOCX",
  export_pdf: "Export PDF premium",
  voice_advanced: "Voice / lettura avanzata",
  study_text_ingest: "Carica testo breve",
  study_summary_basic: "Riassunto base",
  study_summary_advanced: "Riassunto avanzato",
  study_explain_simple: "Spiegazione semplice",
  study_explain_3_levels: "Spiegazione 3 livelli",
  study_flashcards: "Flashcard",
  study_quiz: "Quiz",
  study_oral_exam: "Simulazione interrogazione",
  study_answer_review: "Correzione risposta",
  study_plan: "Piano studio",
  study_mindmap: "Mappa concettuale",
  study_long_material: "Analisi PDF/dispensa lunga",
  study_long_material_heavy: "Analisi PDF molto lungo",
  study_full_exam: "Simulazione esame completa",
  masterpiece_mode: "Masterpiece Mode",
  dev_purchase: "Acquisto crediti",
  plan_grant: "Crediti piano",
  refund: "Rimborso",
};

export function formatPlanLabel(planId: CreditPlanId): string {
  return PLAN_DISPLAY_LABELS[planId] || planId;
}

export function mapOperationToCategory(operation: CreditLedgerEntry["operation"]): CreditConsumptionCategory {
  if (operation === "dev_purchase" || operation === "plan_grant" || operation === "refund") return "purchases";
  if (operation.startsWith("generate_chapter")) return "chapters";
  if (operation === "rewrite_chapter") return "rewrite";
  if (operation === "chapter_diagnostic" || operation === "book_analysis") return "diagnostic";
  if (operation === "cover_generation") return "cover";
  if (operation === "auto_bestseller") return "auto_bestseller";
  if (operation === "kdp_launch") return "kdp";
  if (operation === "export_premium") return "export";
  if (operation === "fix_chapter") return "fix";
  if (operation === "market_intelligence") return "market";
  if (operation === "character_studio_ai") return "character";
  if (operation.startsWith("study_")) return "study";
  return "other";
}

export const CATEGORY_DISPLAY_LABELS: Record<CreditConsumptionCategory, string> = {
  chapters: "Capitoli",
  rewrite: "Rewrite",
  diagnostic: "Diagnostica",
  cover: "Cover",
  auto_bestseller: "Auto Bestseller",
  kdp: "KDP",
  export: "Export",
  fix: "Fix capitolo",
  market: "Market Intelligence",
  character: "Character Studio",
  study: "Study OS",
  other: "Altro",
  purchases: "Acquisti",
};

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export interface WalletAnalytics {
  balance: number;
  planId: CreditPlanId;
  planLabel: string;
  planAllocation: number;
  monthSpent: number;
  monthPurchased: number;
  monthUsed: number;
  byCategory: Record<CreditConsumptionCategory, number>;
  purchases: CreditLedgerEntry[];
  recentLedger: CreditLedgerEntry[];
}

export function computeWalletAnalytics(wallet: CreditWallet, ledger: CreditLedgerEntry[]): WalletAnalytics {
  const monthStart = monthStartIso();
  const monthEntries = ledger.filter((e) => e.createdAt >= monthStart);

  let monthSpent = 0;
  let monthPurchased = 0;
  const byCategory = {} as Record<CreditConsumptionCategory, number>;
  for (const key of Object.keys(CATEGORY_DISPLAY_LABELS) as CreditConsumptionCategory[]) {
    byCategory[key] = 0;
  }

  for (const entry of monthEntries) {
    if (entry.amount < 0) {
      monthSpent += Math.abs(entry.amount);
      const cat = mapOperationToCategory(entry.operation);
      if (cat !== "purchases") byCategory[cat] += Math.abs(entry.amount);
    } else if (entry.amount > 0) {
      monthPurchased += entry.amount;
      if (entry.operation === "dev_purchase" || entry.operation === "plan_grant") {
        byCategory.purchases += entry.amount;
      }
    }
  }

  const purchases = ledger.filter(
    (e) => e.operation === "dev_purchase" || e.operation === "plan_grant" || e.operation === "refund",
  );

  return {
    balance: wallet.balance,
    planId: wallet.planId,
    planLabel: formatPlanLabel(wallet.planId),
    planAllocation: PLAN_CREDIT_ALLOCATION[wallet.planId],
    monthSpent,
    monthPurchased,
    monthUsed: monthSpent,
    byCategory,
    purchases: purchases.slice(0, 20),
    recentLedger: ledger.slice(0, 50),
  };
}

export type LowCreditLevel = "ok" | "low" | "critical";

export function getLowCreditLevel(wallet: CreditWallet): LowCreditLevel {
  if (isDevUnlimitedCredits()) return "ok";
  const allocation = PLAN_CREDIT_ALLOCATION[wallet.planId] || 300;
  if (allocation <= 0) return "ok";
  const ratio = wallet.balance / allocation;
  if (ratio <= 0.1) return "critical";
  if (ratio <= 0.2) return "low";
  return "ok";
}

export function lowCreditMessage(level: LowCreditLevel): string | null {
  if (level === "critical") {
    return "Crediti insufficienti. Ricarica crediti o passa a un piano con crediti mensili.";
  }
  if (level === "low") return "Crediti in esaurimento";
  return null;
}

export function freePlanWalletHint(planId: CreditPlanId): string | null {
  if (planId === "free" || planId === "student_free") {
    return "Free: puoi ricaricare crediti e usare funzioni premium.";
  }
  return null;
}
