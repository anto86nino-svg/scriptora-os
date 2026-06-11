import { toast } from "sonner";
import type { PlanAction, PaymentPlan } from "@/config/payments";
import { resolvePlanAction } from "@/config/payments";
import { buildExternalCheckoutUrl, startProviderCheckout } from "@/lib/payments/checkout";

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
        toast.error("Checkout non disponibile", { description: result.error });
        return { handled: true, showComingSoon: false };
      }
      window.location.href = result.url;
      return { handled: true, openedCheckout: true };
    }
    case "missing_link":
      toast.error("Pagamento non configurato", {
        description: "Il link di checkout non è ancora stato impostato per questo piano.",
      });
      return { handled: true };
    case "coming_soon":
    default:
      return { handled: true, showComingSoon: true, planName: plan.name };
  }
}
