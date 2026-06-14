export type PaymentProviderId = "stripe" | "lemon" | "dev";

export type CreditPlanId =
  | "free"
  | "starter"
  | "pro_author"
  | "studio"
  | "publisher"
  | "student_free"
  | "student_basic"
  | "student_plus"
  | "student_pro_exam";

export type CreditOperationId =
  | "generate_chapter_short"
  | "generate_chapter_medium"
  | "generate_chapter_long"
  | "rewrite_chapter"
  | "chapter_diagnostic"
  | "fix_chapter"
  | "auto_bestseller"
  | "market_intelligence"
  | "kdp_launch"
  | "cover_generation"
  | "character_studio_ai"
  | "book_analysis"
  | "wizard_title_regeneration"
  | "export_premium"
  | "masterpiece_mode"
  | "book_idea"
  | "title_domination"
  | "blueprint_generation"
  | "chapter_regenerate"
  | "analysis_pro_chapter"
  | "patch_chapter"
  | "manuscript_analyzer"
  | "kdp_launch_analysis"
  | "kdp_narrative_flow"
  | "bestseller_radar_scan"
  | "cover_variant"
  | "export_epub"
  | "export_docx"
  | "export_pdf"
  | "voice_advanced"
  | "study_text_ingest"
  | "study_summary_basic"
  | "study_summary_advanced"
  | "study_explain_simple"
  | "study_explain_3_levels"
  | "study_flashcards"
  | "study_quiz"
  | "study_oral_exam"
  | "study_answer_review"
  | "study_plan"
  | "study_mindmap"
  | "study_long_material"
  | "study_long_material_heavy"
  | "study_full_exam";

export interface CreditWallet {
  balance: number;
  planId: CreditPlanId;
  updatedAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  operation: CreditOperationId | "dev_purchase" | "plan_grant" | "refund";
  amount: number;
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  simulated: boolean;
  createdAt: string;
}

export interface CreditCommitResult {
  ok: boolean;
  committed: boolean;
  cost: number;
  balanceAfter: number;
  simulated: boolean;
  error?: string;
}

export interface BillingPurchaseResult {
  ok: boolean;
  creditsAdded: number;
  balanceAfter: number;
  provider: PaymentProviderId;
  simulated: boolean;
  error?: string;
}

export interface OperationCostQuote {
  baseCost: number;
  discountPercent: number;
  finalCost: number;
  label: string;
}
