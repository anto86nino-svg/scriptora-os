export const SCRIPTORA_LOGO_SRC = "/brand/scriptora-logo.png";
export const SCRIPTORA_BRAND_NAME = "Scriptora OS";
export const SCRIPTORA_BRAND_YELLOW = "#f2c400";
export const SCRIPTORA_BRAND_BLACK = "#050505";

export const SCRIPTORA_FREE_WATERMARK_TEXT_IT = "Creato con Scriptora OS · Piano Free";
export const SCRIPTORA_FREE_WATERMARK_TEXT_EN = "Created with Scriptora OS · Free Plan";

export function getScriptoraWatermarkText(language?: string | null): string {
  const lang = (language || "").toLowerCase();
  if (lang.startsWith("en")) return SCRIPTORA_FREE_WATERMARK_TEXT_EN;
  return SCRIPTORA_FREE_WATERMARK_TEXT_IT;
}

export function getScriptoraFreeUpgradeText(language?: string | null): string {
  const lang = (language || "").toLowerCase();
  if (lang.startsWith("en")) return "Free signature visible. Removed on paid plans.";
  return "Firma Free visibile. Si rimuove con un piano a pagamento.";
}

export function isPaidPlan(plan?: string | null): boolean {
  const normalized = String(plan || "free").toLowerCase().trim();
  if (!normalized || normalized === "free" || normalized.includes("free")) return false;
  if (normalized.includes("starter")) return true;
  if (normalized.includes("pro")) return true;
  if (normalized.includes("premium")) return true;
  if (normalized.includes("studio")) return true;
  if (normalized.includes("publisher")) return true;
  if (normalized.includes("student")) return true;
  return normalized !== "free";
}

export function shouldApplyScriptoraFreeWatermark(plan?: string | null): boolean {
  return !isPaidPlan(plan);
}

export function appendScriptoraFreeWatermarkToText(
  content: string,
  plan?: string | null,
  language?: string | null,
): string {
  const clean = String(content || "").trimEnd();
  if (!clean || !shouldApplyScriptoraFreeWatermark(plan)) return content;
  const mark = getScriptoraWatermarkText(language);
  if (clean.includes(mark)) return clean;
  return `${clean}\n\n— ${mark}`;
}
