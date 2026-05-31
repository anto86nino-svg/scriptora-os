export {
  calculateCreditCost,
  canRunCreditOperation,
  getCreditOperationLabel,
  getMonthlyCreditsForPlan,
  getRecommendedCreditPack,
  wordCountScalingMultiplier,
  CREDIT_OPERATION_BASE_COSTS,
  CREDIT_PACKS,
  INTENSITY_MULTIPLIERS,
  PLAN_MONTHLY_CREDITS,
  PLAN_OPERATION_DISCOUNTS,
  PROVIDER_MULTIPLIERS,
  type AiProviderKey,
  type CreditCostParams,
  type CreditIntensity,
  type CreditOperation,
  type CreditPackOffer,
  type CreditRunCheckParams,
  type CreditRunCheckResult,
  type ScriptoraPlan,
} from "@/lib/billing/creditPolicy";

export { mapPlanTierToScriptoraPlan } from "@/lib/billing/planAdapter";

export {
  buildLocalCreditWalletSnapshot,
  clearLocalCreditWalletCache,
  isCreditEnforcementActive,
  loadCreditWallet,
  recordLocalCreditUsage,
  type CreditWalletSnapshot,
} from "@/lib/billing/creditWallet";

export { fetchRemoteCreditWallet } from "@/lib/billing/creditWalletServer";

export {
  commitCreditReservation,
  prepareCreditReservation,
  refundCreditReservation,
  type CreditReservationResult,
} from "@/lib/billing/creditReservation";

export {
  creditsToPackId,
  isPaidScriptoraPlan,
  redirectToStripeCheckout,
  startStripeCheckout,
  type StripeCheckoutResult,
} from "@/lib/billing/stripeCheckout";

export {
  COMMERCIAL_PLANS,
  COMMERCIAL_PLAN_LABELS,
  getCommercialPlanLabel,
  type CommercialPlanOffer,
} from "@/lib/billing/commercialPlans";

export { getLaunchPathCreditEstimate, type LaunchPathMode } from "@/lib/billing/launchPathCredits";

export {
  showPremiumActivationNotice,
  PREMIUM_ACTIVATION_EVENT,
  type PremiumActivationVariant,
  type PremiumActivationDetail,
} from "@/lib/billing/premiumActivation";
