export interface OverOptimizationFinding {
  id: string;
  message: string;
  severity: "warning" | "critical";
}

export interface OverOptimizationReport {
  score: number;
  findings: OverOptimizationFinding[];
  blocked: boolean;
}

const CLIFFHANGER_ENDINGS = /\b(domani|tomorrow|before dawn|prima che|if she survived|would pay|non sapeva ancora)\b/gi;
const MEMORABLE_CLUSTERS = /\b(statua|faceless|wrong door|black leaf|rune|wrist|whispered)\b/gi;
const SYMBOL_SPAM = /\b(symbol|simbolo|metaphor|metafora|destiny|destino|shadow of|ombra dell)\b/gi;

export function detectOverOptimization(text: string): OverOptimizationReport {
  const findings: OverOptimizationFinding[] = [];
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((part) => part.length > 20);
  const cliffEndings = (text.match(CLIFFHANGER_ENDINGS) || []).length;
  const memorableHits = (text.match(MEMORABLE_CLUSTERS) || []).length;
  const symbolHits = (text.match(SYMBOL_SPAM) || []).length;
  const questionEnds = paragraphs.filter((part) => /\?\s*$/.test(part.trim())).length;

  if (cliffEndings >= 4) {
    findings.push({
      id: "cliff-spam",
      severity: "critical",
      message: "Troppi cliffhanger / forward-pull — rischio Netflix trailer syndrome",
    });
  }
  if (memorableHits >= 6) {
    findings.push({
      id: "memorability-spam",
      severity: "warning",
      message: "Troppe immagini 'memorabili' concentrate — sembra AI che prova troppo",
    });
  }
  if (symbolHits >= 5) {
    findings.push({
      id: "symbol-spam",
      severity: "warning",
      message: "Eccesso di simbolismo / metafora",
    });
  }
  if (questionEnds >= 3 && paragraphs.length <= 5) {
    findings.push({
      id: "question-spam",
      severity: "warning",
      message: "Troppe chiusure a domanda ravvicinate",
    });
  }
  if (sentences.filter((sentence) => sentence.length > 180).length >= 3) {
    findings.push({
      id: "over-poetic",
      severity: "warning",
      message: "Pacing troppo poetico/cinematico — accorcia e concretizza",
    });
  }

  const penalty = findings.reduce((sum, finding) => sum + (finding.severity === "critical" ? 22 : 12), 0);
  const score = Math.max(0, 100 - penalty);

  return {
    score,
    findings,
    blocked: findings.some((finding) => finding.severity === "critical"),
  };
}

export function buildOverOptimizationGuardBlock(): string {
  return `OVER-OPTIMIZATION GUARD:
Prima di forzare greatness, chiediti: "Questo migliora davvero il libro o sembra AI che prova troppo?"
VIETATO:
• cliffhanger ogni scena
• frasi memorabili consecutive
• simbolismo eccessivo
• tensione melodrammatica costante
• prosa da trailer Netflix
Preferisci: umano, coerente, commerciale, predicibile nel genere.`;
}
