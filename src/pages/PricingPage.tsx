// Public pricing page — author + student plans, universal credits, operation cost transparency.
// Stripe checkout uses legacy plan mapping where configured; new plans show safe coming-soon flow.

import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import { PaymentStatusBanner } from "@/components/payments/PaymentStatusBanner";
import { FeatureStatusBadge } from "@/components/payments/FeatureStatusBadge";
import { ScriptoraPricingCatalog } from "@/components/pricing/ScriptoraPricingCatalog";
import { toast } from "sonner";

export default function PricingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") !== "cancelled") return;
    toast.info(t("payment_cancelled_title"), { description: t("payment_cancelled_desc") });
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <div className="flex items-center gap-3">
            <FeatureStatusBadge featureId="payments" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scriptora · Prezzi</span>
          </div>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <PaymentStatusBanner />
        <ScriptoraPricingCatalog showBackLink />
      </main>
    </div>
  );
}
