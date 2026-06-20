import { STUDY_OS_PRO_PLAN, STUDY_USAGE_LIMITS } from "@/lib/study-os/study-limits";
import type { CreditPlanId } from "./types";

export type PricingAudience = "authors" | "students";

export interface SubscriptionPlanDefinition {
  id: CreditPlanId;
  audience: PricingAudience;
  name: string;
  priceLabel: string;
  priceNumeric: number;
  period: string;
  monthlyCredits: number;
  includedUsageLabel?: string;
  tagline: string;
  promise: string;
  features: string[];
  badge?: "recommended" | "popular" | "premium";
  /** Legacy Stripe/payments plan id — TODO: map Stripe price id in env/config. */
  legacyCheckoutPlanId?: string;
}

export interface CreditPackDefinition {
  id: string;
  audience: PricingAudience | "general";
  name: string;
  priceLabel: string;
  priceNumeric: number;
  credits: number;
  tagline?: string;
}

export interface OperationCostExample {
  label: string;
  credits: string;
}

export const AUTHOR_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: "free",
    audience: "authors",
    name: "Free",
    priceLabel: "€0",
    priceNumeric: 0,
    period: "/mese",
    monthlyCredits: 300,
    tagline: "Prova Scriptora prima di sbloccare la scrittura.",
    promise: "Prova Scriptora: trova l'idea, genera titoli e crea una prima struttura.",
    features: ["300 crediti/mese", "3 Blueprint Preview salvate", "10 generazioni titolo/mese", "Crediti extra acquistabili"],
  },
  {
    id: "starter",
    audience: "authors",
    name: "Starter",
    priceLabel: "€9,99",
    priceNumeric: 9.99,
    period: "/mese",
    monthlyCredits: 3_000,
    tagline: "Per iniziare il tuo primo libro.",
    promise: "Inizia fino a 3 progetti brevi/medi, oppure completa un libro breve con strumenti essenziali.",
    features: ["3.000 crediti/mese", "12 Blueprint/mese", "Sconto 5% funzioni autore", "Export e diagnostica"],
    legacyCheckoutPlanId: undefined,
  },
  {
    id: "pro_author",
    audience: "authors",
    name: "Author Pro",
    priceLabel: "€19,99",
    priceNumeric: 19.99,
    period: "/mese",
    monthlyCredits: 8_000,
    tagline: "Il piano principale per autori indipendenti.",
    promise: "Crea 3–5 libri medi con Book Forge, Writer OS, export e strumenti editoriali.",
    features: ["8.000 crediti/mese", "30 Blueprint/mese", "Sconto 10% funzioni autore", "KDP · Cover · Export"],
    badge: "recommended",
    legacyCheckoutPlanId: "pro_monthly",
  },
  {
    id: "studio",
    audience: "authors",
    name: "Studio",
    priceLabel: "€49,99",
    priceNumeric: 49.99,
    period: "/mese",
    monthlyCredits: 25_000,
    tagline: "Per autori che costruiscono cataloghi.",
    promise: "Produzione seria per autori che pubblicano: libri lunghi, cover, audit, KDP e più progetti.",
    features: ["25.000 crediti/mese", "100 Blueprint/mese", "Sconto 20% funzioni autore", "Cover · KDP · Radar"],
    badge: "premium",
    legacyCheckoutPlanId: "premium_monthly",
  },
  {
    id: "publisher",
    audience: "authors",
    name: "Publisher",
    priceLabel: "€99,99",
    priceNumeric: 99.99,
    period: "/mese",
    monthlyCredits: 60_000,
    tagline: "Per produzione editoriale intensiva.",
    promise: "Per autori seriali, cataloghi e piccoli editori.",
    features: ["60.000 crediti/mese", "250 Blueprint/mese", "Sconto 30% su tutte le funzioni", "Priorità produzione"],
    legacyCheckoutPlanId: undefined,
  },
];

export const STUDENT_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: "study_os_pro",
    audience: "students",
    name: STUDY_OS_PRO_PLAN.name,
    priceLabel: `€${STUDY_OS_PRO_PLAN.priceEurMonthly}`,
    priceNumeric: STUDY_OS_PRO_PLAN.priceEurMonthly,
    period: "/mese",
    monthlyCredits: 0,
    includedUsageLabel: "Uso Study incluso con limiti equi",
    tagline: "Studia con riassunti, quiz, flashcard e interrogazioni guidate.",
    promise: "Study OS completo a prezzo semplice, senza crediti complicati per lo studente base.",
    features: [
      "20 €/mese, rinnovo mensile",
      `${STUDY_USAGE_LIMITS.monthlySessions} sessioni Study/mese`,
      `${STUDY_USAGE_LIMITS.weeklyMaterials} materiali/settimana`,
      `${STUDY_USAGE_LIMITS.monthlyAiOperations} elaborazioni AI Study/mese`,
      "PDF, DOCX, TXT, MD, EPUB e testo incollato",
      "OCR reale se supportato dal browser",
      "Modalità rapida locale se serve completare l'elaborazione",
    ],
    badge: "recommended",
  },
];

export const GENERAL_CREDIT_PACKS: CreditPackDefinition[] = [
  { id: "micro", audience: "general", name: "Micro", priceLabel: "€2", priceNumeric: 2, credits: 500 },
  { id: "mini", audience: "general", name: "Mini", priceLabel: "€3", priceNumeric: 3, credits: 1_000 },
  { id: "author", audience: "general", name: "Author", priceLabel: "€7", priceNumeric: 7, credits: 3_000 },
  { id: "studio_pack", audience: "general", name: "Studio Pack", priceLabel: "€19", priceNumeric: 19, credits: 10_000 },
  { id: "publisher_pack", audience: "general", name: "Publisher Pack", priceLabel: "€39", priceNumeric: 39, credits: 25_000 },
];

export const STUDENT_CREDIT_PACKS: CreditPackDefinition[] = [
  { id: "study_extension", audience: "students", name: "Estensione Study", priceLabel: "Presto", priceNumeric: 0, credits: 0, tagline: "Uso extra mensile quando il checkout sarà attivo" },
];

export const AUTHOR_COST_EXAMPLES: OperationCostExample[] = [
  { label: "Blueprint + 1 capitolo + Analysis Pro", credits: "≈ 720" },
  { label: "Sistemare un capitolo già scritto", credits: "≈ 370" },
  { label: "KDP Launch + Bestseller Radar", credits: "≈ 700" },
  { label: "Cover + export EPUB/PDF", credits: "≈ 730" },
  { label: "Mini libro 10 capitoli", credits: "≈ 3.800–5.500" },
];

export const STUDENT_COST_EXAMPLES: OperationCostExample[] = [
  { label: "Riassunto + quiz", credits: "Incluso nei limiti Study" },
  { label: "Spiegazione + flashcard", credits: "Incluso nei limiti Study" },
  { label: "Simulazione interrogazione", credits: "Incluso nei limiti Study" },
  { label: "Analisi dispensa lunga + piano studio", credits: "Incluso nei limiti Study" },
  { label: "Sessione esame completa", credits: "Incluso nei limiti Study" },
];

export const UNIVERSAL_CREDITS_MESSAGE =
  "I crediti extra sono pensati per autori e operazioni AI intensive: capitoli, KDP, cover, export e audit.";

export const STUDENT_PACKS_MESSAGE =
  "Study OS Pro usa abbonamento semplice. Le estensioni extra sono predisposte ma non attive in questa beta.";

export const TRANSPARENCY_BULLETS = [
  "Ogni azione mostra il costo in crediti prima di partire.",
  "Se un'operazione autore supera il saldo, puoi ricaricare senza cambiare piano.",
  "Study OS Pro resta separato: 20 €/mese con limiti equi anti-abuso.",
] as const;

export function getSubscriptionPlanById(id: CreditPlanId): SubscriptionPlanDefinition | undefined {
  return [...AUTHOR_SUBSCRIPTION_PLANS, ...STUDENT_SUBSCRIPTION_PLANS].find((p) => p.id === id);
}
