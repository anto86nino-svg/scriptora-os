import { supabase } from "@/integrations/supabase/client";
import { analyzeStudyMaterial, type StudySessionResult } from "@/lib/study-session";

interface GenerateStudySessionAIInput {
  text: string;
  sourceName: string;
  language?: "Italian" | "English" | "Spanish" | "French" | "German";
  level?: "soft" | "medium" | "pro";
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

function normalizeString(value: unknown, fallback = ""): string {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter(Boolean) as T[] : [];
}

function normalizeStudyResult(parsed: any, fallback: StudySessionResult): StudySessionResult {
  const difficulty = parsed?.difficulty === "soft" || parsed?.difficulty === "medium" || parsed?.difficulty === "pro"
    ? parsed.difficulty
    : fallback.difficulty;

  const difficultWords = normalizeArray<any>(parsed?.difficultWords).slice(0, 14).map((item) => ({
    word: normalizeString(item?.word, "Termine"),
    simple: normalizeString(item?.simple, "Spiegazione semplice non disponibile."),
    technical: normalizeString(item?.technical, "Spiegazione tecnica non disponibile."),
    example: normalizeString(item?.example, "Prova a usare questo termine in una frase tua."),
  }));

  const flashcards = normalizeArray<any>(parsed?.flashcards).slice(0, 16).map((item) => ({
    front: normalizeString(item?.front, "Domanda"),
    back: normalizeString(item?.back, "Risposta"),
  }));

  const quiz = normalizeArray<any>(parsed?.quiz).slice(0, 12).map((item) => {
    const options = normalizeArray<string>(item?.options).map((option) => String(option || "").trim()).filter(Boolean).slice(0, 4);
    const answer = Number.isFinite(Number(item?.answer)) ? Number(item.answer) : 0;
    return {
      question: normalizeString(item?.question, "Domanda di verifica"),
      options: options.length === 4 ? options : ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      answer: Math.max(0, Math.min(3, answer)),
      explanation: normalizeString(item?.explanation, "Rileggi il concetto nel riassunto Pro."),
    };
  });

  const keyConcepts = normalizeArray<string>(parsed?.keyConcepts)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 16);

  return {
    ...fallback,
    title: normalizeString(parsed?.title, fallback.title),
    detectedSubject: normalizeString(parsed?.detectedSubject, fallback.detectedSubject),
    difficulty,
    lightSummary: normalizeString(parsed?.lightSummary, fallback.lightSummary),
    mediumSummary: normalizeString(parsed?.mediumSummary, fallback.mediumSummary),
    proSummary: normalizeString(parsed?.proSummary, fallback.proSummary),
    difficultWords: difficultWords.length ? difficultWords : fallback.difficultWords,
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quiz: quiz.length ? quiz : fallback.quiz,
    keyConcepts: keyConcepts.length ? keyConcepts : fallback.keyConcepts,
  };
}

function trimStudyInput(text: string): string {
  const clean = String(text || "").trim();
  if (clean.length <= 26000) return clean;
  return `${clean.slice(0, 18000)}\n\n[...contenuto centrale omesso per limiti AI...]\n\n${clean.slice(-7000)}`;
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
  if (!parsed.content) throw new Error("DeepSeek non ha restituito contenuto.");

  return parsed.content;
}

export async function generateStudySessionWithAI(input: GenerateStudySessionAIInput): Promise<StudySessionResult> {
  const fallback = analyzeStudyMaterial(input.text, input.sourceName);
  const language = input.language || "Italian";
  const level = input.level || fallback.difficulty || "medium";
  const material = trimStudyInput(input.text);

  const systemPrompt = `You are Scriptora Study OS, an elite academic tutor.

You transform study material into clear, exam-ready learning assets.

LANGUAGE RULE:
Respond entirely in ${language}. No English unless the uploaded material itself requires a quoted term.

OUTPUT RULE:
Return ONLY valid JSON. No markdown. No commentary outside JSON.

QUALITY RULES:
- Light summary: simple, clear, for first understanding.
- Medium summary: more complete, ordered, with key logic.
- Pro summary: exam/interrogation-ready, deeper and structured.
- Difficult words: explain simple meaning, technical meaning, and give example.
- Flashcards: useful for active recall.
- Quiz: not childish; include answer index 0-3 and explanation.
- Do not invent facts not present in the material.
- If material is incomplete, say it politely inside summaries.`;

  const userPrompt = `Create a professional study session from this material.

Desired level: ${level}
Source name: ${input.sourceName}

Return this JSON shape exactly:
{
  "title": "string",
  "detectedSubject": "string",
  "difficulty": "soft | medium | pro",
  "lightSummary": "string",
  "mediumSummary": "string",
  "proSummary": "string",
  "difficultWords": [
    {
      "word": "string",
      "simple": "string",
      "technical": "string",
      "example": "string"
    }
  ],
  "flashcards": [
    {
      "front": "string",
      "back": "string"
    }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": 0,
      "explanation": "string"
    }
  ],
  "keyConcepts": ["string"]
}

MATERIAL:
${material}`;

  const raw = await callScriptoraStudyAI(systemPrompt, userPrompt);
  const parsed = safeJsonParse(raw);
  return normalizeStudyResult(parsed, fallback);
}
