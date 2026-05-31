import { toast } from "sonner";
import { t } from "@/lib/i18n";

/** Human premium copy for operation failures — avoids raw technical errors in toasts. */
export function premiumErrorMessage(detail?: string | null, fallbackKey = "scriptora_error_generic"): string {
  const base = t(fallbackKey);
  const trimmed = detail?.trim();
  if (!trimmed || trimmed.length > 120 || /^(error|failed|exception)/i.test(trimmed)) {
    return base;
  }
  return `${base} (${trimmed})`;
}

export function toastPremiumError(detail?: string | null, fallbackKey = "scriptora_error_generic"): void {
  toast.error(premiumErrorMessage(detail, fallbackKey), {
    classNames: {
      toast: "scriptora-premium-toast",
    },
  });
}
