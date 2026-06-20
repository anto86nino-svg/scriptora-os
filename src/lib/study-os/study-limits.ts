import type { UILanguage } from "@/lib/i18n";
import { estimateProviderCostEur } from "@/lib/ai-provider-pricing";

export interface StudyOsPlan {
  id: "study_os_pro";
  name: string;
  priceEurMonthly: number;
  reset: "monthly";
  included: string[];
}

export interface StudyUsageLimits {
  monthlySessions: number;
  weeklyMaterials: number;
  monthlyAiOperations: number;
  weeklyQuizOrFlashcardRuns: number;
  monthlyOralExamRuns: number;
  maxUploadMb: number;
  maxWordsPerMaterial: number;
  softLimitPercent: number;
  hardLimitPercent: number;
}

export interface StudyCostModel {
  lightUserCostEur: number;
  normalUserCostEur: number;
  intenseUserCostEur: number;
  abuseGuardCostEur: number;
  targetMonthlyPriceEur: number;
}

export const STUDY_OS_PRO_PLAN: StudyOsPlan = {
  id: "study_os_pro",
  name: "Study OS Pro",
  priceEurMonthly: 20,
  reset: "monthly",
  included: [
    "Upload PDF, DOCX, TXT, MD, EPUB e testo incollato",
    "Immagini con OCR reale quando il browser lo supporta",
    "Riassunti, quiz, flashcard, mappe e interrogazioni",
    "Sessioni salvate, attestati e piano studio",
    "Fallback locale quando l'AI non risponde",
  ],
};

export const STUDY_USAGE_LIMITS: StudyUsageLimits = {
  monthlySessions: 120,
  weeklyMaterials: 35,
  monthlyAiOperations: 420,
  weeklyQuizOrFlashcardRuns: 90,
  monthlyOralExamRuns: 80,
  maxUploadMb: 60,
  maxWordsPerMaterial: 90_000,
  softLimitPercent: 80,
  hardLimitPercent: 100,
};

export const STUDY_EXTENSION_STATUS = {
  available: false,
  label: "Estensione Study mensile",
  message: "Il checkout per uso extra Study è predisposto ma non attivo in questa beta.",
} as const;

export function estimateStudyOsCostModel(): StudyCostModel {
  const summary = estimateProviderCostEur(6_000, 3_000);
  const quiz = estimateProviderCostEur(4_000, 2_200);
  const oral = estimateProviderCostEur(5_500, 2_500);
  const plan = estimateProviderCostEur(4_000, 1_800);

  return {
    lightUserCostEur: (summary + quiz) * 8,
    normalUserCostEur: (summary + quiz + oral + plan) * 22,
    intenseUserCostEur: (summary + quiz + oral + plan) * 60,
    abuseGuardCostEur: (summary + quiz + oral + plan) * 120,
    targetMonthlyPriceEur: STUDY_OS_PRO_PLAN.priceEurMonthly,
  };
}

const LIMIT_MESSAGES: Record<UILanguage, { hard: string; soft: string }> = {
  it: {
    hard: "Hai raggiunto il limite di utilizzo Study OS per questo periodo. Il tuo abbonamento si rinnova tra {days} giorni. Puoi continuare a consultare sessioni salvate, riassunti, quiz e attestati gia' creati.",
    soft: "Hai usato molte elaborazioni Study questa settimana. Per proteggere la qualita' del servizio, continua pure a studiare dai materiali salvati e pianifica le nuove generazioni.",
  },
  en: {
    hard: "You reached the Study OS usage limit for this period. Your subscription renews in {days} days. You can still review saved sessions, summaries, quizzes and certificates.",
    soft: "You have used many Study generations this week. To protect service quality, keep studying from saved materials and plan new generations carefully.",
  },
  es: {
    hard: "Has alcanzado el limite de uso de Study OS para este periodo. Tu suscripcion se renueva en {days} dias. Puedes seguir consultando sesiones, resumenes, quizzes y certificados guardados.",
    soft: "Has usado muchas generaciones Study esta semana. Para proteger la calidad del servicio, sigue estudiando desde materiales guardados y planifica nuevas generaciones.",
  },
  fr: {
    hard: "Vous avez atteint la limite d'utilisation Study OS pour cette periode. Votre abonnement se renouvelle dans {days} jours. Vous pouvez encore consulter sessions, resumes, quiz et certificats sauvegardes.",
    soft: "Vous avez utilise beaucoup de generations Study cette semaine. Pour proteger la qualite du service, continuez avec les contenus sauvegardes et planifiez les prochaines generations.",
  },
  de: {
    hard: "Du hast das Study OS Nutzungslimit fur diesen Zeitraum erreicht. Dein Abo erneuert sich in {days} Tagen. Gespeicherte Sessions, Zusammenfassungen, Quizze und Zertifikate bleiben nutzbar.",
    soft: "Du hast diese Woche viele Study-Generierungen genutzt. Zum Schutz der Servicequalitat kannst du mit gespeicherten Materialien weiterlernen und neue Generierungen planen.",
  },
};

export function formatStudyLimitMessage(
  language: UILanguage = "it",
  daysUntilRenewal = 1,
  severity: "soft" | "hard" = "hard",
): string {
  const template = (LIMIT_MESSAGES[language] || LIMIT_MESSAGES.it)[severity];
  return template.replace("{days}", String(Math.max(0, Math.ceil(daysUntilRenewal))));
}
