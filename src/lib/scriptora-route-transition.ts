export type ScriptoraAliveTone =
  | "dashboard"
  | "writer"
  | "kdp"
  | "radar"
  | "cover"
  | "study"
  | "pricing"
  | "auth"
  | "export"
  | "default";

export interface RouteTransitionConfig {
  title: string;
  steps: string[];
  tone: ScriptoraAliveTone;
}

export const ROUTE_TRANSITION_COPY: Record<string, RouteTransitionConfig> = {
  "/dashboard": {
    tone: "dashboard",
    title: "Apro il tuo studio editoriale…",
    steps: [
      "Sto riordinando progetti, strumenti e continuità…",
      "Sto preparando il tuo spazio creativo…",
      "Quasi pronto: il tuo universo sta tornando in superficie…",
    ],
  },
  "/app": {
    tone: "writer",
    title: "Sto aprendo Writer OS…",
    steps: [
      "Sto caricando manoscritto, capitoli e memoria narrativa…",
      "Sto preparando editor, note e strumenti editoriali…",
      "Sto rimettendo il testo al centro…",
    ],
  },
  "/writer": {
    tone: "writer",
    title: "Sto aprendo Writer OS…",
    steps: [
      "Sto caricando manoscritto, capitoli e memoria narrativa…",
      "Sto preparando editor, note e strumenti editoriali…",
      "Sto rimettendo il testo al centro…",
    ],
  },
  "/kdp-launch": {
    tone: "kdp",
    title: "Sto preparando KDP Launch…",
    steps: [
      "Sto raccogliendo titolo, promessa e posizionamento…",
      "Sto aprendo il laboratorio commerciale…",
      "Sto preparando il flusso editoriale per il mercato…",
    ],
  },
  "/bestseller-radar": {
    tone: "radar",
    title: "Sto accendendo Bestseller Radar…",
    steps: [
      "Sto leggendo hook, titolo e promessa…",
      "Sto preparando score, rischi e leve commerciali…",
      "Sto cercando dove il libro può diventare più vendibile…",
    ],
  },
  "/bestseller": {
    tone: "radar",
    title: "Sto accendendo Bestseller Radar…",
    steps: [
      "Sto leggendo hook, titolo e promessa…",
      "Sto preparando score, rischi e leve commerciali…",
      "Sto aprendo il radar commerciale del libro…",
    ],
  },
  "/publishing": {
    tone: "export",
    title: "Sto aprendo Publishing Center…",
    steps: [
      "Sto leggendo readiness, cover e metadata…",
      "Sto collegando export, KDP e checklist…",
      "Sto preparando il percorso finale verso la pubblicazione…",
    ],
  },
  "/auto-bestseller": {
    tone: "radar",
    title: "Sto preparando Auto Bestseller…",
    steps: [
      "Sto leggendo idea, genere e posizionamento…",
      "Sto costruendo blueprint commerciale…",
      "Sto cercando la direzione più vendibile…",
    ],
  },
  "/cover": {
    tone: "cover",
    title: "Sto aprendo Cover Studio…",
    steps: [
      "Sto preparando genere, atmosfera e impatto visivo…",
      "Sto caricando template e readiness…",
      "Sto cercando una copertina che parli al lettore giusto…",
    ],
  },
  "/study": {
    tone: "study",
    title: "Sto preparando Study OS…",
    steps: [
      "Sto aprendo riassunti, quiz e flashcard…",
      "Sto preparando il materiale per lo studio guidato…",
      "Sto trasformando confusione in comprensione…",
    ],
  },
  "/study-session": {
    tone: "study",
    title: "Sto preparando la sessione di studio…",
    steps: [
      "Sto caricando dispense, appunti e capitoli…",
      "Sto preparando quiz, flashcard e spiegazioni…",
      "Sto aprendo il tuo percorso guidato…",
    ],
  },
  "/pricing": {
    tone: "pricing",
    title: "Sto sincronizzando piani e crediti…",
    steps: [
      "Sto caricando abbonamenti, pacchetti e wallet…",
      "Sto preparando le opzioni più adatte al tuo uso…",
      "Quasi pronto: scegli come creare con Scriptora…",
    ],
  },
  "/usage": {
    tone: "pricing",
    title: "Sto aprendo il tuo wallet…",
    steps: [
      "Sto leggendo crediti, piano e storico…",
      "Sto preparando ricariche e pacchetti…",
      "Sto sincronizzando il saldo visibile…",
    ],
  },
  "/auth": {
    tone: "auth",
    title: "Sto aprendo l'accesso…",
    steps: [
      "Sto preparando login sicuro…",
      "Sto verificando sessione e consenso…",
      "Quasi pronto per entrare in Scriptora…",
    ],
  },
  "/downloads": {
    tone: "export",
    title: "Sto aprendo i download…",
    steps: [
      "Sto recuperando export e file pronti…",
      "Sto preparando manoscritti e copertine…",
      "Quasi pronto per scaricare…",
    ],
  },
  "/keyword-gold": {
    tone: "kdp",
    title: "Sto preparando Keyword Gold…",
    steps: [
      "Sto analizzando nicchia e parole chiave…",
      "Sto cercando leve di posizionamento KDP…",
      "Sto aprendo il laboratorio commerciale…",
    ],
  },
  default: {
    tone: "default",
    title: "Scriptora sta preparando il prossimo spazio…",
    steps: [
      "Sto caricando gli strumenti necessari…",
      "Sto sistemando interfaccia e dati…",
      "Quasi pronto…",
    ],
  },
};

const ROUTE_MATCH_ORDER = [
  "/study-session",
  "/bestseller-radar",
  "/auto-bestseller",
  "/kdp-launch",
  "/keyword-gold",
  "/study",
  "/writer",
  "/dashboard",
  "/pricing",
  "/usage",
  "/downloads",
  "/publishing",
  "/bestseller",
  "/identity",
  "/app",
  "/auth",
  "/cover",
  "/install",
  "/diagnostics",
] as const;

export function resolveRouteTransitionConfig(pathname: string): RouteTransitionConfig {
  const path = pathname.split("?")[0].split("#")[0] || "/";
  for (const key of ROUTE_MATCH_ORDER) {
    if (path === key || path.startsWith(`${key}/`)) {
      return ROUTE_TRANSITION_COPY[key] ?? ROUTE_TRANSITION_COPY.default;
    }
  }
  if (path === "/") {
    return {
      tone: "default",
      title: "Sto aprendo Scriptora…",
      steps: [
        "Sto preparando la home pubblica…",
        "Sto caricando strumenti e percorsi…",
        "Quasi pronto…",
      ],
    };
  }
  return ROUTE_TRANSITION_COPY.default;
}

export function resolveRotatingStep(steps: string[], index: number): string {
  if (!steps.length) return "";
  return steps[index % steps.length] ?? steps[0];
}
