import { hasStudyPlaceholderText } from "@/lib/study-os/study-quality-gates";
import { explainProfessionalWord } from "@/lib/professional-dictionary";
import type { DifficultWord } from "@/lib/study-session";
import type { StudyMaterialClassification } from "@/lib/study-session";

function sentenceContext(text: string, term: string, radius = 1): string {
  const sentences = text.replace(/\n+/g, " ").match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [];
  const lower = term.toLowerCase();
  const hit = sentences.find((s) => s.toLowerCase().includes(lower));
  if (!hit) return "";
  const index = sentences.indexOf(hit);
  const slice = sentences.slice(Math.max(0, index - radius), index + radius + 1);
  return slice.join(" ").trim();
}

function buildImportanceSentence(term: string, classification?: StudyMaterialClassification): string {
  if (classification?.type === "history") {
    return `Capire "${term}" aiuta a ricostruire cause, eventi e conseguenze del periodo storico studiato.`;
  }
  if (classification?.type === "law") {
    return `"${term}" è utile per collegare norme, obblighi ed effetti pratici nel materiale.`;
  }
  return `"${term}" è un concetto chiave per organizzare lo studio e rispondere a verifiche sul tema.`;
}

function buildReviewQuestion(term: string, classification?: StudyMaterialClassification): string {
  if (classification?.type === "history") {
    return `Perché "${term}" è rilevante nello svolgimento o nelle conseguenze degli eventi descritti?`;
  }
  return `Come spiegheresti "${term}" con definizione ed esempio tratto dal testo?`;
}

/** Build a real vocabulary entry — no placeholder templates. */
export function buildStudyTermDefinition(
  term: string,
  sourceText: string,
  classification?: StudyMaterialClassification,
  connections: string[] = [],
): DifficultWord {
  const entry = explainProfessionalWord(term);
  const context = sentenceContext(sourceText, term);
  const inText = context
    ? `Nel testo significa: ${context.replace(/\s+/g, " ").trim()}`
    : `Nel testo significa: compare come elemento centrale per comprendere ${classification?.label || "il tema"}.`;

  const simple = entry.simple;
  const technical = entry.technical;
  const example = entry.example || `Esempio: "${term}" si collega a un passaggio concreto del materiale studiato.`;
  const importance = buildImportanceSentence(term, classification);

  const school = [
    `Termine: ${entry.word}`,
    `Definizione semplice: ${simple}`,
    inText,
    `Perché è importante: ${importance}`,
    `Esempio: ${example}`,
    `Domanda di ripasso: ${buildReviewQuestion(term, classification)}`,
  ].join("\n");

  const advanced = [
    technical,
    inText,
    connections.length ? `Collegamenti: ${connections.join(" · ")}` : "",
  ].filter(Boolean).join(" ");

  return {
    word: entry.word,
    simple,
    technical: advanced || technical,
    school,
    advanced,
    precise: technical,
    example,
    newExample: example,
    examQuestion: buildReviewQuestion(term, classification),
    connections: connections.slice(0, 4),
    commonMistake: `Confondere "${entry.word}" con una parola generica senza spiegare il suo ruolo nel materiale.`,
    importance: "alto",
  };
}

export function isRealStudyDefinition(word: DifficultWord): boolean {
  const joined = [
    word.simple,
    word.technical,
    word.school,
    word.advanced,
    word.example,
    word.examQuestion,
  ].join(" ");

  if (hasStudyPlaceholderText(joined)) return false;
  if (/\bdefinizione scolastica\b/i.test(joined)) return false;
  if (/\bda spiegare\b/i.test(joined)) return false;
  if (/\bdefinizione \+ esempio\b/i.test(joined)) return false;
  if (/\bcollegalo al tema centrale\b/i.test(joined)) return false;
  if (/\bconcetto da spiegare\b/i.test(joined)) return false;
  if (!word.simple?.trim() || !word.technical?.trim() || !word.example?.trim()) return false;
  return true;
}
