import { toast } from "sonner";
import type { PlanAction, PaymentPlan } from "@/config/payments";
import { resolvePlanAction } from "@/config/payments";
import { buildExternalCheckoutUrl, startProviderCheckout } from "@/lib/payments/checkout";
import { getUserFriendlyError } from "@/lib/user-friendly-error";
import { trackScriptoraEvent } from "@/lib/usage-analytics";

export interface ExecutePlanActionResult {
  handled: boolean;
  openedCheckout?: boolean;
  showComingSoon?: boolean;
  planName?: string;
}

export async function executePlanAction(plan: PaymentPlan): Promise<ExecutePlanActionResult> {
  const action = resolvePlanAction(plan);
  return executeResolvedPlanAction(action, plan);
}

export async function executeResolvedPlanAction(
  action: PlanAction,
  plan: PaymentPlan,
): Promise<ExecutePlanActionResult> {
  switch (action.kind) {
    case "free":
      window.location.href = "/dashboard";
      return { handled: true };
    case "external": {
      const url = buildExternalCheckoutUrl(action.url, plan.id);
      window.open(url, "_blank", "noopener,noreferrer");
      return { handled: true, openedCheckout: true };
    }
    case "checkout_session": {
      const result = await startProviderCheckout(action.planId);
      if ("error" in result) {
        trackScriptoraEvent({ eventName: "paywall_opened", tool: "payments", success: false, errorCategory: "checkout_not_configured" });
        toast.error("Checkout non disponibile", {
          description: getUserFriendlyError(result.error, {
            area: "payment",
            fallback: "Il checkout reale non è ancora attivo in questa build. Il progetto e la selezione sono stati salvati.",
          }),
        });
        return { handled: true, showComingSoon: false };
      }
      window.location.href = result.url;
      return { handled: true, openedCheckout: true };
    }
    case "missing_link":
      toast.error("Pagamento non configurato", {
        description: "Il checkout reale non è ancora attivo in questa build. La selezione è stata salvata.",
      });
      return { handled: true };
    case "coming_soon":
    default:
      return { handled: true, showComingSoon: true, planName: plan.name };
  }
}
