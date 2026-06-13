import { supabase } from "@/integrations/supabase/client";
import {
  buildStudyOsSystemPrompt,
  buildStudyOsUserPrompt,
  enrichStudySessionLocally,
  parseStudyOsAiResponse,
  type StudyGoal,
  type StudyLevel,
  type StudyOsSessionResult,
} from "@/lib/study-os";

interface GenerateStudySessionAIInput {
  text: string;
  sourceName: string;
  language?: "Italian" | "English" | "Spanish" | "French" | "German";
  level?: "soft" | "medium" | "pro";
  studyLevel?: StudyLevel;
  goal?: StudyGoal;
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
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error("Risposta AI non leggibile.");
  }
}

function normalizeStudyResult(parsed: any, fallback: StudyOsSessionResult, language: string): StudyOsSessionResult {
  return parseStudyOsAiResponse(parsed, fallback, language);
}

function trimStudyInput(text: string): string {
  const clean = String(text || "").trim();
  if (clean.length <= 36000) return clean;

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 80);

  if (paragraphs.length < 12) {
    return `${clean.slice(0, 22000)}\n\n[...sezione centrale compressa automaticamente da Scriptora Study OS...]\n\n${clean.slice(-12000)}`;
  }

  const picked: string[] = [];
  const slots = 18;
  for (let i = 0; i < slots; i++) {
    const index = Math.min(paragraphs.length - 1, Math.floor((i / Math.max(1, slots - 1)) * (paragraphs.length - 1)));
    const paragraph = paragraphs[index];
    if (paragraph && !picked.includes(paragraph)) picked.push(paragraph);
  }

  return [
    "[SCRIPTORA STUDY OS — CAMPIONAMENTO INTELLIGENTE DOCUMENTO LUNGO]",
    "Il documento originale è lungo. Questo estratto conserva apertura, sviluppo centrale e chiusura per evitare riassunti basati solo sull'inizio e sulla fine.",
    "",
    ...picked.map((part, index) => `--- BLOCCO ${index + 1} ---\n${part.slice(0, 1800)}`),
  ].join("\n\n").slice(0, 38000);
}

async function callScriptoraStudyAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
      taskType: "study_session",
      projectId: null,
      userId: sessionData?.session?.user?.id || null,
      metadata: {
        feature: "study_session",
        mode: "deepseek",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI Studio non disponibile (${res.status}).`);
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
  if (!parsed.content) throw new Error("Scriptora non ha restituito contenuto.");

  return parsed.content;
}

export async function generateStudySessionWithAI(input: GenerateStudySessionAIInput): Promise<StudyOsSessionResult> {
  const language = input.language || "Italian";
  const goal = input.goal || "exam";
  const studyLevel = input.studyLevel || "high_school";
  const fallback = enrichStudySessionLocally(input.text, input.sourceName, goal);
  const level = input.level || fallback.difficulty || "medium";
  const material = trimStudyInput(input.text);

  const systemPrompt = buildStudyOsSystemPrompt(language);
  const userPrompt = buildStudyOsUserPrompt({
    material,
    sourceName: input.sourceName,
    level,
    studyLevel,
    goal,
    language,
  });

  const raw = await callScriptoraStudyAI(systemPrompt, userPrompt);
  const parsed = safeJsonParse(raw);
  return normalizeStudyResult(parsed, { ...fallback, difficulty: level === "soft" || level === "pro" ? level : fallback.difficulty }, language);
}

export interface StudyErrorTutorInput {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
  explanation?: string;
  language?: string;
}

export interface StudyErrorTutorResult {
  correctAnswer: string;
  whyWrong: string;
  reviewTip: string;
  source: "ai" | "local";
}

export async function explainStudyQuizError(input: StudyErrorTutorInput): Promise<StudyErrorTutorResult> {
  const correct = input.options[input.correctIndex] || "risposta corretta";
  const selected = input.options[input.selectedIndex] || "la tua scelta";
  const local: StudyErrorTutorResult = {
    correctAnswer: correct,
    whyWrong: `"${selected}" non è la risposta migliore. ${input.explanation || `La risposta corretta è: ${correct}`}`,
    reviewTip: "Ripassa il concetto collegandolo a un esempio concreto, poi rifai 2 domande simili.",
    source: "local",
  };

  try {
    const { data, error } = await supabase.functions.invoke("scriptora-study-tutor", {
      body: {
        question: input.question,
        options: input.options,
        correctIndex: input.correctIndex,
        selectedIndex: input.selectedIndex,
        language: input.language || "Italian",
      },
    });
    if (error) throw error;
    const text = String(data?.whyWrong || data?.explanation || "").trim();
    if (text) {
      return {
        correctAnswer: String(data?.correctAnswer || correct),
        whyWrong: text,
        reviewTip: String(data?.reviewTip || local.reviewTip),
        source: "ai",
      };
    }
  } catch {
    /* fallback local */
  }

  return local;
}
