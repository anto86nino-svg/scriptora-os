import { isPaymentsLive } from "@/config/payments";

export type TrustDestroyerLevel = 1 | 2 | 3 | 4 | 5;

export type TrustDestroyerStatus = "open" | "fixed" | "mitigated";

export interface TrustDestroyerItem {
  id: string;
  title: string;
  level: TrustDestroyerLevel;
  area: "writing" | "editorial" | "publishing" | "mobile" | "performance" | "commercial";
  status: TrustDestroyerStatus;
  path?: string;
  description: string;
}

/** Registry of known trust destroyers — updated as fixes ship. */
export function trustDestroyerRegistry(): TrustDestroyerItem[] {
  const paymentsLive = isPaymentsLive();

  return [
    {
      id: "export-wrong-author",
      title: "Export con autore errato o inventato",
      level: 5,
      area: "publishing",
      status: "fixed",
      path: "src/lib/export-author.ts",
      description: "Rimosso fallback hardcoded; export bloccato senza Identità Autore configurata.",
    },
    {
      id: "export-credits-before-validation",
      title: "Crediti addebitati prima della validazione export",
      level: 5,
      area: "commercial",
      status: "fixed",
      path: "src/components/HomeExportDialog.tsx",
      description: "Addebito spostato dopo export riuscito; rimborso automatico su fallimento.",
    },
    {
      id: "blueprint-silent-fallback",
      title: "Blueprint corrotto con skeleton silenzioso",
      level: 5,
      area: "writing",
      status: "fixed",
      path: "src/lib/generation.ts",
      description: "Parse JSON fallito ora genera errore esplicito invece di struttura fittizia.",
    },
    {
      id: "editorial-jobs-lost-refresh",
      title: "Job editoriali persi al refresh",
      level: 4,
      area: "editorial",
      status: "fixed",
      path: "src/contexts/DominationContext.tsx",
      description: "Job ready/error persistiti in sessionStorage.",
    },
    {
      id: "writer-white-screen",
      title: "Schermata bianca su crash Writer /app",
      level: 5,
      area: "writing",
      status: "fixed",
      path: "src/App.tsx",
      description: "FeatureErrorBoundary aggiunto su /app e Dashboard.",
    },
    {
      id: "book-analysis-billed-not-built",
      title: "book_analysis fatturato ma non implementato",
      level: 4,
      area: "editorial",
      status: "mitigated",
      path: "src/lib/billing/creditPolicy.ts",
      description: "Operazione non esposta in UI; resta solo in policy finché non esiste backend.",
    },
    {
      id: "payments-coming-soon-cta",
      title: "CTA acquisto visibile senza checkout funzionante",
      level: 4,
      area: "commercial",
      status: "fixed",
      path: "src/components/UpgradeModal.tsx",
      description: paymentsLive
        ? "Pagamenti live via env."
        : "Coming soon esplicito: modal + banner, zero checkout silenzioso.",
    },
    {
      id: "mobile-touch-targets",
      title: "Touch target sotto 44px",
      level: 3,
      area: "mobile",
      status: "fixed",
      path: "src/index.css",
      description: "ios-toolbar-button portato a 44px minimo.",
    },
    {
      id: "mobile-viewport-h-screen",
      title: "h-screen causa clip su Safari mobile",
      level: 3,
      area: "mobile",
      status: "fixed",
      path: "src/pages/Index.tsx",
      description: "Writer usa min-h-dvh invece di h-screen.",
    },
    {
      id: "dashboard-heavy-bundle",
      title: "Dashboard carica bundle pesante eager",
      level: 3,
      area: "performance",
      status: "fixed",
      path: "src/pages/Dashboard.tsx",
      description: "Dialog pesanti lazy-loaded; chunk dashboard <220KB.",
    },
    {
      id: "cloud-save-silent-fail",
      title: "Salvataggio cloud fallisce in silenzio",
      level: 4,
      area: "writing",
      status: "fixed",
      path: "src/hooks/useBookEngine.ts",
      description: "Sync pending/offline visibile nelle superfici operative.",
    },
    {
      id: "manuscript-analyzer-heuristic",
      title: "Manuscript Lab score euristico non AI",
      level: 3,
      area: "editorial",
      status: "fixed",
      path: "src/components/ManuscriptAnalyzerDialog.tsx",
      description: "Baseline onesta (68) + disclaimer esplicito in UI.",
    },
    {
      id: "writer-path-fragmentation",
      title: "Percorsi creazione libro frammentati",
      level: 3,
      area: "writing",
      status: "fixed",
      path: "src/components/one-flow/BookCreationOsWizard.tsx",
      description: "Percorso primario unificato: OneFlow → Wizard → /app.",
    },
    {
      id: "paragraph-fix-no-undo",
      title: "Fix paragrafo senza undo",
      level: 4,
      area: "editorial",
      status: "fixed",
      path: "src/lib/chapter-revisions.ts",
      description: "Undo + cronologia revisioni in ChapterIntelligencePanel.",
    },
  ];
}

export interface TrustDestroyerAuditResult {
  items: TrustDestroyerItem[];
  openByLevel: Record<TrustDestroyerLevel, number>;
  openLevel5: number;
  fixedCount: number;
  mitigatedCount: number;
  openCount: number;
  /** 0–100 — penalizza Level 5 aperti molto più dei cosmetici */
  destroyerScore: number;
}

export function trustDestroyerAudit(): TrustDestroyerAuditResult {
  const items = trustDestroyerRegistry();
  const openByLevel: Record<TrustDestroyerLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let openLevel5 = 0;
  let fixedCount = 0;
  let mitigatedCount = 0;
  let openCount = 0;
  let penalty = 0;

  const weights: Record<TrustDestroyerLevel, number> = {
    5: 18,
    4: 10,
    3: 5,
    2: 2,
    1: 1,
  };

  for (const item of items) {
    if (item.status === "fixed") {
      fixedCount += 1;
      continue;
    }
    if (item.status === "mitigated") {
      mitigatedCount += 1;
      penalty += Math.round(weights[item.level] * 0.35);
      continue;
    }
    openCount += 1;
    openByLevel[item.level] += 1;
    if (item.level === 5) openLevel5 += 1;
    penalty += weights[item.level];
  }

  const destroyerScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    items,
    openByLevel,
    openLevel5,
    fixedCount,
    mitigatedCount,
    openCount,
    destroyerScore,
  };
}
