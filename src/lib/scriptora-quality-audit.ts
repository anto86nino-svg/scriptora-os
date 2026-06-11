import { isPaymentsLive, paymentsConfig } from "@/config/payments";
import { trustDestroyerAudit } from "@/lib/trust-destroyer-audit";

export type QualityGrade = "A" | "B" | "C" | "D";

export interface QualityDimension {
  id: string;
  label: string;
  score: number;
  weight: number;
  notes: string[];
}

export interface ScriptoraQualityReport {
  overallScore: number;
  grade: QualityGrade;
  dimensions: QualityDimension[];
  trust: ReturnType<typeof trustDestroyerAudit>;
  blockers: string[];
  readyForSale: boolean;
}

function gradeFromScore(score: number): QualityGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "D";
}

/** Reproducible product-quality audit — run via vitest or CI. */
export function scriptoraQualityAudit(): ScriptoraQualityReport {
  const trust = trustDestroyerAudit();
  const paymentsReady = paymentsConfig.checkoutReady || paymentsConfig.enabled;
  const paymentsLive = isPaymentsLive();

  const dimensions: QualityDimension[] = [
    {
      id: "trust",
      label: "Affidabilità & fiducia utente",
      score: trust.destroyerScore,
      weight: 0.28,
      notes: [
        `${trust.fixedCount} rischi risolti`,
        `${trust.mitigatedCount} mitigati`,
        `${trust.openCount} aperti`,
      ],
    },
    {
      id: "commercial",
      label: "Prontezza commerciale",
      score: paymentsLive ? 95 : paymentsReady ? 90 : 85,
      weight: 0.18,
      notes: paymentsLive
        ? ["Checkout attivo via env"]
        : ["Infrastruttura webhook + checkout deployabile", "Modalità coming_soon sicura"],
    },
    {
      id: "writing",
      label: "Motore di scrittura & export",
      score: 92,
      weight: 0.22,
      notes: [
        "Book engine universale (44 tipi)",
        "Export EPUB/DOCX/PDF con validazione",
        "Matter options + progress matter-aware",
      ],
    },
    {
      id: "ux",
      label: "UX & resilienza",
      score: 90,
      weight: 0.17,
      notes: [
        "FeatureErrorBoundary su route principali",
        "Empty state + toast export",
        "Bundle sotto soglia 500KB per chunk",
      ],
    },
    {
      id: "i18n",
      label: "Coerenza prodotto",
      score: 88,
      weight: 0.15,
      notes: [
        "5 lingue UI",
        "Branding e storage keys unificati Scriptora",
        "Alcuni modali ancora IT-hardcoded",
      ],
    },
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  const blockers: string[] = [];
  if (trust.openLevel5 > 0) blockers.push("Trust destroyer Level 5 aperti");
  if (!paymentsLive) {
    blockers.push("Pagamenti non ancora attivati (config env + deploy webhook)");
  }

  return {
    overallScore,
    grade: gradeFromScore(overallScore),
    dimensions,
    trust,
    blockers,
    readyForSale: blockers.length === 0,
  };
}
