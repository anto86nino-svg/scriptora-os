import { isPaymentsLive } from "@/config/payments";

export type FeatureStatus = "live" | "beta" | "coming_soon";

const STATUS: Record<string, FeatureStatus> = {
  writer_studio: "live",
  book_architect: "live",
  blueprint: "live",
  chapter_generation: "live",
  chapter_diagnostic: "live",
  surgical_patch: "live",
  dominate_mode: "live",
  cover_studio: "live",
  export_studio: "live",
  kdp_launch: "beta",
  auto_bestseller: "beta",
  study_os: "beta",
  voice_studio: "beta",
  audiobook_listen: "live",
  audiobook_script: "beta",
  audiobook_mp3: "coming_soon",
  book_analysis: "coming_soon",
  payments: isPaymentsLive() ? "live" : "coming_soon",
  credit_purchase: isPaymentsLive() ? "live" : "coming_soon",
};

export function getFeatureStatus(featureId: string): FeatureStatus {
  return STATUS[featureId] || "live";
}

export function featureStatusLabel(status: FeatureStatus): string {
  if (status === "live") return "Live";
  if (status === "beta") return "Beta";
  return "Presto";
}

export function canShowPurchaseCta(): boolean {
  return isPaymentsLive();
}
