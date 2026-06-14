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
    tagline: "Prova gratis. Acquista crediti quando vuoi.",
    promise: "Prova Scriptora e compra crediti quando vuoi.",
    features: ["300 crediti/mese", "1 progetto attivo", "Acquisto crediti universali", "Study OS con crediti"],
  },
  {
    id: "starter",
    audience: "authors",
    name: "Starter",
    priceLabel: "€9,99",
    priceNumeric: 9.99,
    period: "/mese",
    monthlyCredits: 2_000,
    tagline: "Per iniziare il tuo primo libro.",
    promise: "Inizia blueprint, capitoli e strumenti base.",
    features: ["2.000 crediti/mese", "Sconto 5% funzioni autore", "Crediti universali", "Export e diagnostica"],
    legacyCheckoutPlanId: undefined,
  },
  {
    id: "pro_author",
    audience: "authors",
    name: "Author Pro",
    priceLabel: "€19,99",
    priceNumeric: 19.99,
    period: "/mese",
    monthlyCredits: 6_000,
    tagline: "Il piano principale per autori indipendenti.",
    promise: "Crea e pubblica un libro con il cuore di Scriptora.",
    features: ["6.000 crediti/mese", "Sconto 10% funzioni autore", "KDP · Cover · Export", "Study OS con crediti"],
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
    monthlyCredits: 20_000,
    tagline: "Per autori che costruiscono cataloghi.",
    promise: "Produzione intensiva, serie e più progetti.",
    features: ["20.000 crediti/mese", "Sconto 20% funzioni autore", "Cover · KDP · Radar", "Per cataloghi e serie"],
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
    monthlyCredits: 50_000,
    tagline: "Per produzione editoriale intensiva.",
    promise: "Power user e piccoli editori.",
    features: ["50.000 crediti/mese", "Sconto 30% su tutte le funzioni", "Volume alto", "Priorità produzione"],
    legacyCheckoutPlanId: undefined,
  },
];

export const STUDENT_SUBSCRIPTION_PLANS: SubscriptionPlanDefinition[] = [
  {
    id: "student_free",
    audience: "students",
    name: "Student Free",
    priceLabel: "€0",
    priceNumeric: 0,
    period: "/mese",
    monthlyCredits: 300,
    tagline: "Prova Study OS gratis.",
    promise: "Mini riassunti, quiz leggeri, prova Study OS.",
    features: ["300 crediti/mese", "Acquisto pack studenti", "Funzioni autore con crediti", "Riassunti e quiz base"],
  },
  {
    id: "student_basic",
    audience: "students",
    name: "Student Basic",
    priceLabel: "€4,99",
    priceNumeric: 4.99,
    period: "/mese",
    monthlyCredits: 1_500,
    tagline: "Scuola e superiori.",
    promise: "Riassunti, quiz e flashcard leggere.",
    features: ["1.500 crediti/mese", "Sconto 5% Study OS", "Flashcard e quiz", "Crediti universali"],
  },
  {
    id: "student_plus",
    audience: "students",
    name: "Student Plus",
    priceLabel: "€9,99",
    priceNumeric: 9.99,
    period: "/mese",
    monthlyCredits: 4_000,
    tagline: "Universitari e dispense.",
    promise: "PDF, dispense, spiegazioni a 3 livelli.",
    features: ["4.000 crediti/mese", "Sconto 10% Study OS", "Analisi PDF", "Piani studio"],
    badge: "recommended",
  },
  {
    id: "student_pro_exam",
    audience: "students",
    name: "Student Pro Exam",
    priceLabel: "€19,99",
    priceNumeric: 19.99,
    period: "/mese",
    monthlyCredits: 10_000,
    tagline: "Esami e sessioni intense.",
    promise: "Simulazioni d'esame, piani studio, studio massivo.",
    features: ["10.000 crediti/mese", "Sconto 20% Study OS", "Simulazioni complete", "Sessioni d'esame"],
    badge: "popular",
  },
];

export const GENERAL_CREDIT_PACKS: CreditPackDefinition[] = [
  { id: "mini", audience: "general", name: "Mini", priceLabel: "€4,99", priceNumeric: 4.99, credits: 1_000 },
  { id: "creator", audience: "general", name: "Creator", priceLabel: "€9,99", priceNumeric: 9.99, credits: 2_300 },
  { id: "author", audience: "general", name: "Author", priceLabel: "€19,99", priceNumeric: 19.99, credits: 5_200 },
  { id: "studio_pack", audience: "general", name: "Studio Pack", priceLabel: "€49,99", priceNumeric: 49.99, credits: 15_000 },
  { id: "publisher_pack", audience: "general", name: "Publisher Pack", priceLabel: "€99,99", priceNumeric: 99.99, credits: 35_000 },
];

export const STUDENT_CREDIT_PACKS: CreditPackDefinition[] = [
  { id: "ripasso", audience: "students", name: "Ripasso veloce", priceLabel: "€1,99", priceNumeric: 1.99, credits: 400, tagline: "Quiz e mini riassunti" },
  { id: "interrogazione", audience: "students", name: "Interrogazione", priceLabel: "€4,99", priceNumeric: 4.99, credits: 1_200, tagline: "Simulazione orale" },
  { id: "settimana", audience: "students", name: "Settimana studio", priceLabel: "€9,99", priceNumeric: 9.99, credits: 3_000, tagline: "Una settimana intensa" },
  { id: "sessione_esami", audience: "students", name: "Sessione esami", priceLabel: "€19,99", priceNumeric: 19.99, credits: 7_000, tagline: "Preparazione completa" },
];

export const AUTHOR_COST_EXAMPLES: OperationCostExample[] = [
  { label: "Blueprint + 1 capitolo + Analysis Pro", credits: "≈ 720" },
  { label: "Sistemare un capitolo già scritto", credits: "≈ 370" },
  { label: "KDP Launch + Bestseller Radar", credits: "≈ 700" },
  { label: "Cover + export EPUB/PDF", credits: "≈ 730" },
  { label: "Mini libro 10 capitoli", credits: "≈ 3.800–5.500" },
];

export const STUDENT_COST_EXAMPLES: OperationCostExample[] = [
  { label: "Riassunto + quiz", credits: "≈ 200" },
  { label: "Spiegazione 3 livelli + flashcard", credits: "≈ 280" },
  { label: "Simulazione interrogazione", credits: "≈ 180" },
  { label: "Analisi dispensa lunga + piano studio", credits: "≈ 460–760" },
  { label: "Sessione esame completa", credits: "≈ 500" },
];

export const UNIVERSAL_CREDITS_MESSAGE =
  "Anche con il piano Free puoi acquistare crediti e usare funzioni premium.";

export const STUDENT_PACKS_MESSAGE =
  "Per ripassi veloci, interrogazioni e sessioni d'esame.";

export const TRANSPARENCY_BULLETS = [
  "Ogni azione mostra il costo in crediti prima di partire.",
  "Se non hai saldo sufficiente, puoi ricaricare senza cambiare piano.",
  "Gli abbonamenti includono crediti mensili e sconti sulle funzioni più usate.",
] as const;

export function getSubscriptionPlanById(id: CreditPlanId): SubscriptionPlanDefinition | undefined {
  return [...AUTHOR_SUBSCRIPTION_PLANS, ...STUDENT_SUBSCRIPTION_PLANS].find((p) => p.id === id);
}
