import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { t } from "@/lib/i18n";

/** Shows soft success/cancel banners after Stripe redirect (?checkout=success|cancelled). */
export function CheckoutReturnBanner() {
  const [params, setParams] = useSearchParams();
  const checkout = params.get("checkout");

  if (checkout !== "success" && checkout !== "cancelled") return null;

  const dismiss = () => {
    params.delete("checkout");
    setParams(params, { replace: true });
  };

  if (checkout === "success") {
    return (
      <div className="mx-auto mb-8 flex max-w-3xl items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">{t("checkout_success_title")}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("checkout_success_body")}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {t("checkout_dismiss")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-8 flex max-w-3xl items-start gap-3 rounded-xl border border-border bg-muted/40 px-5 py-4">
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-foreground">{t("checkout_cancel_title")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("checkout_cancel_body")}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        {t("checkout_dismiss")}
      </button>
    </div>
  );
}
