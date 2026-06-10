import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { buildSmartCreditRecommendation } from "@/lib/billing/creditPsychology";
import { getOperationCost } from "@/lib/billing/creditPolicy";

export function SmartCreditRecommendation() {
  const navigate = useNavigate();
  const { wallet } = useCreditWallet();
  const chapterCost = getOperationCost("generate_chapter_medium");
  const message = buildSmartCreditRecommendation(wallet.balance, chapterCost);

  if (!message) return null;

  return (
    <div className="mt-3 rounded-xl border border-sky-400/25 bg-gradient-to-r from-sky-500/10 to-indigo-500/8 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-sky-100/90">{message}</p>
          <button
            type="button"
            onClick={() => navigate("/usage?focus=purchase")}
            className="mt-1.5 text-[11px] font-semibold text-sky-200 underline-offset-2 hover:underline"
          >
            Supporta il tuo momentum creativo →
          </button>
        </div>
      </div>
    </div>
  );
}
