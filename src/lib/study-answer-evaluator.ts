import { supabase } from "@/integrations/supabase/client";

export interface StudyAnswerEvaluation {
  score: number;
  level: "fragile" | "base" | "good" | "excellent";
  strengths: string[];
  missing: string[];
  improvedAnswer: string;
  advice: string;
  engine: "deepseek" | "local";
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeJsonParse(raw: string): any {
  const clean = String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("Valutazione AI non leggibile.");
  }
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const clean = value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6);
  return clean.length ? clean : fallback;
}

function normalizeEvaluation(parsed: any): StudyAnswerEvaluation {
  const score = clampScore(Number(parsed?.score));
  const level =
    parsed?.level === "excellent" || parsed?.level === "good" || parsed?.level === "base" || parsed?.level === "fragile"
      ? parsed.level
      : score >= 86 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "base" : "fragile";

  return {
    score,
    level,
    strengths: normalizeStringArray(parsed?.strengths, ["Hai provato a rispondere alla domanda in modo personale."]),
    missing: normalizeStringArray(parsed?.missing, ["Aggiungi definizioni, collegamenti e un esempio concreto."]),
    improvedAnswer: String(parsed?.improvedAnswer || "").trim() || "Risposta modello non disponibile.",
    advice: String(parsed?.advice || "").trim() || "Rileggi la Scheda Studio Pro e prova a rispondere con più struttura.",
    engine: "deepseek",
  };
}

export function evaluateStudyAnswerLocal(input: {
  question: string;
  answerGuide: string;
  answer: string;
}): StudyAnswerEvaluation {
  const answer = input.answer.trim();
  const words = answer.split(/\s+/).filter(Boolean);
  const lower = answer.toLowerCase();
  const guideWords = input.answerGuide
    .toLowerCase()
    .match(/[\p{L}][\p{L}'’-]{5,}/gu) || [];

  const uniqueGuide = Array.from(new Set(guideWords)).slice(0, 18);
  const matched = uniqueGuide.filter((word) => lower.includes(word)).length;

  let score = 35;
  if (words.length >= 40) score += 20;
  if (words.length >= 90) score += 15;
  if (matched >= 2) score += 10;
  if (matched >= 5) score += 10;
  if (/[.:;!?]/.test(answer)) score += 5;
  if (/\b(esempio|per esempio|infatti|quindi|perché|perche|significa|collega|tema)\b/i.test(answer)) score += 5;

  score = clampScore(score);

  return {
    score,
    level: score >= 86 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "base" : "fragile",
    strengths: [
      words.length >= 40 ? "La risposta ha una base sviluppata." : "Hai iniziato a formulare una risposta.",
      matched > 0 ? "Hai intercettato alcuni concetti della guida." : "Hai provato a rispondere con parole tue.",
    ],
    missing: [
      words.length < 80 ? "Serve una risposta più lunga e argomentata." : "Puoi rendere la risposta ancora più precisa.",
      "Aggiungi definizione, collegamento al tema centrale ed esempio concreto.",
    ],
    improvedAnswer: `${input.answerGuide}\n\nUna risposta forte dovrebbe partire da una definizione chiara, spiegare il ruolo del concetto nel materiale e chiudere con un esempio concreto.`,
    advice: "Riscrivi la risposta seguendo questa formula: definizione → spiegazione → collegamento → esempio.",
    engine: "local",
  };
}

async function callStudyEvaluationAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book`;

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Configurazione Supabase mancante.");
  }

  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
  const bearer = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      taskType: "study_answer_evaluation",
      projectId: null,
      userId: sessionData?.session?.user?.id || null,
      metadata: {
        feature: "study_session",
        mode: "answer_evaluation",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Valutazione AI non disponibile (${res.status}).`);
  }

  if (!res.body) throw new Error("Stream AI non disponibile.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  const marker = buffer.lastIndexOf("__RESULT__");
  if (marker === -1) throw new Error("Risposta AI vuota o incompleta.");

  const jsonStr = buffer.slice(marker + "__RESULT__".length).trim();
  const parsed = JSON.parse(jsonStr);

  if (parsed.error) throw new Error(parsed.error);
  if (!parsed.content) throw new Error("DeepSeek non ha restituito valutazione.");

  return parsed.content;
}

export async function evaluateStudyAnswerWithAI(input: {
  materialTitle: string;
  question: string;
  answerGuide: string;
  answer: string;
  language?: "Italian" | "English" | "Spanish" | "French" | "German";
}): Promise<StudyAnswerEvaluation> {
  const local = evaluateStudyAnswerLocal(input);

  const systemPrompt = `You are Scriptora Study OS Examiner.

You evaluate a student's open answer like a serious but encouraging teacher.

LANGUAGE:
Respond entirely in ${input.language || "Italian"}.

OUTPUT:
Return ONLY valid JSON. No markdown. No text outside JSON.

Evaluation criteria:
- conceptual accuracy
- completeness
- clarity
- connection to the material
- use of examples
- exam/interrogation readiness

Do not be cruel. Be honest, specific, useful.`;

  const userPrompt = `Evaluate this student answer.

Material title:
${input.materialTitle}

Question:
${input.question}

Expected answer guide:
${input.answerGuide}

Student answer:
${input.answer}

Return this JSON:
{
  "score": 0,
  "level": "fragile | base | good | excellent",
  "strengths": ["string"],
  "missing": ["string"],
  "improvedAnswer": "string",
  "advice": "string"
}`;

  try {
    const raw = await callStudyEvaluationAI(systemPrompt, userPrompt);
    return normalizeEvaluation(safeJsonParse(raw));
  } catch (error) {
    console.warn("[StudyAnswerEvaluation] DeepSeek fallback locale", error);
    return local;
  }
}
