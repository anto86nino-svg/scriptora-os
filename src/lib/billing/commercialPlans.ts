import { getMonthlyCreditsForPlan, type ScriptoraPlan } from "@/lib/billing/creditPolicy";

export interface CommercialPlanOffer {
  id: ScriptoraPlan;
  nameKey: string;
  taglineKey: string;
  priceEur: number | null;
  periodKey: string;
  monthlyCredits: number;
  featureKeys: readonly string[];
  recommended?: boolean;
}

export const COMMERCIAL_PLAN_LABELS: Record<ScriptoraPlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro Author",
  studio: "Studio",
  publisher: "Publisher",
};

export function getCommercialPlanLabel(plan: ScriptoraPlan): string {
  return COMMERCIAL_PLAN_LABELS[plan] ?? plan;
}

export const COMMERCIAL_PLANS: readonly CommercialPlanOffer[] = [
  {
    id: "free",
    nameKey: "commercial_plan_free_name",
    taglineKey: "commercial_plan_free_tagline",
    priceEur: 0,
    periodKey: "commercial_plan_period_free",
    monthlyCredits: getMonthlyCreditsForPlan("free"),
    featureKeys: [
      "commercial_plan_free_f1",
      "commercial_plan_free_f2",
      "commercial_plan_free_f3",
      "commercial_plan_free_f4",
    ],
  },
  {
    id: "starter",
    nameKey: "commercial_plan_starter_name",
    taglineKey: "commercial_plan_starter_tagline",
    priceEur: 9.99,
    periodKey: "commercial_plan_period_month",
    monthlyCredits: getMonthlyCreditsForPlan("starter"),
    featureKeys: [
      "commercial_plan_starter_f1",
      "commercial_plan_starter_f2",
      "commercial_plan_starter_f3",
    ],
  },
  {
    id: "pro",
    nameKey: "commercial_plan_pro_name",
    taglineKey: "commercial_plan_pro_tagline",
    priceEur: 19.99,
    periodKey: "commercial_plan_period_month",
    monthlyCredits: getMonthlyCreditsForPlan("pro"),
    recommended: true,
    featureKeys: [
      "commercial_plan_pro_f1",
      "commercial_plan_pro_f2",
      "commercial_plan_pro_f3",
      "commercial_plan_pro_f4",
      "commercial_plan_pro_f5",
    ],
  },
  {
    id: "studio",
    nameKey: "commercial_plan_studio_name",
    taglineKey: "commercial_plan_studio_tagline",
    priceEur: 49.99,
    periodKey: "commercial_plan_period_month",
    monthlyCredits: getMonthlyCreditsForPlan("studio"),
    featureKeys: [
      "commercial_plan_studio_f1",
      "commercial_plan_studio_f2",
      "commercial_plan_studio_f3",
      "commercial_plan_studio_f4",
      "commercial_plan_studio_f5",
    ],
  },
  {
    id: "publisher",
    nameKey: "commercial_plan_publisher_name",
    taglineKey: "commercial_plan_publisher_tagline",
    priceEur: 99.99,
    periodKey: "commercial_plan_period_month",
    monthlyCredits: getMonthlyCreditsForPlan("publisher"),
    featureKeys: [
      "commercial_plan_publisher_f1",
      "commercial_plan_publisher_f2",
      "commercial_plan_publisher_f3",
      "commercial_plan_publisher_f4",
    ],
  },
] as const;
