export type PaymentProviderId = "stripe" | "lemon" | "dev";

export type CreditPlanId = "free" | "starter" | "pro_author" | "studio" | "publisher";

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
  | "masterpiece_mode";

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
